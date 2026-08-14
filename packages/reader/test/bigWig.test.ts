import { readFile } from "node:fs/promises";
import { afterEach, beforeAll, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  createBigWigFile,
  type BigWigFile,
  type BigWigFileOptions,
  type BigWigReadOptions,
  type BigWigRecord,
  type BigWigResolution,
  type BigWigSummaryRecord,
  type BigWigValueRecord,
  type GenomicFile,
  type GenomicRecord,
  type ReadOptions,
} from "../src/lib";
import { parseBbiHeader } from "../src/internal/bbi/commonHeader";
import { parseBbiZoomHeaders } from "../src/internal/bbi/zoomHeaders";

const url = "https://example.test/basic.bw";
let fixture: Uint8Array;
let uncompressedFixture: Uint8Array;
let bigBedFixture: Uint8Array;
let sourceRecords: BigWigValueRecord[];

beforeAll(async () => {
  const [compressedBytes, uncompressedBytes, bedGraphSource, bigBedBytes] = await Promise.all([
    readFile(new URL("./fixtures/bigwig/basic.bw", import.meta.url)),
    readFile(new URL("./fixtures/bigwig/basic-unc.bw", import.meta.url)),
    readFile(new URL("./fixtures/bigwig/basic.bedGraph", import.meta.url), "utf8"),
    readFile(new URL("./fixtures/bigbed/basic.bb", import.meta.url)),
  ]);
  fixture = compressedBytes;
  uncompressedFixture = uncompressedBytes;
  bigBedFixture = bigBedBytes;
  sourceRecords = bedGraphSource
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const [chromosome, start, end, value] = line.split("\t");
      return {
        kind: "value",
        chromosome: chromosome!,
        start: Number(start),
        end: Number(end),
        value: Number(value),
      };
    });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function installFixtureFetch(bytes = fixture): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
    const range = new Headers(init?.headers).get("Range");
    const match = /^bytes=(\d+)-(\d+)$/.exec(range ?? "");
    if (match === null) throw new Error(`Unexpected Range header: ${range}`);
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end >= bytes.byteLength) {
      throw new Error(`Unexpected byte request: ${range}`);
    }
    return Promise.resolve(
      new Response(bytes.slice(start, end + 1), {
        status: 206,
        headers: { "Content-Range": `bytes ${start}-${end}/${bytes.byteLength}` },
      }),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestedRanges(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>): string[] {
  return fetchMock.mock.calls.map(([, init]) => new Headers(init?.headers).get("Range") ?? "");
}

function recordsForRegion(chromosome: string, start: number, end: number): BigWigValueRecord[] {
  return sourceRecords.filter(
    (record) => record.chromosome === chromosome && record.start < end && record.end > start,
  );
}

describe("createBigWigFile", () => {
  it("exposes the exact structural public API and creates a request-free reusable file", () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const options: BigWigFileOptions = { url };
    const file = createBigWigFile(options);

    expectTypeOf(file).toEqualTypeOf<BigWigFile>();
    expectTypeOf(file).toMatchTypeOf<GenomicFile<BigWigRecord>>();
    expectTypeOf<BigWigReadOptions>().toEqualTypeOf<
      ReadOptions & { resolution?: BigWigResolution }
    >();
    expectTypeOf<BigWigValueRecord>().toEqualTypeOf<
      GenomicRecord & { kind: "value"; value: number }
    >();
    expectTypeOf<BigWigSummaryRecord>().toEqualTypeOf<
      GenomicRecord & {
        kind: "summary";
        validCount: number;
        min: number;
        max: number;
        sum: number;
        sumSquares: number;
        mean: number;
      }
    >();
    expectTypeOf<BigWigResolution>().toEqualTypeOf<
      | { mode: "unzoomed" }
      | { mode: "auto"; basesPerPixel: number }
      | { mode: "level"; reductionLevel: number }
    >();
    expect(fetchMock).not.toHaveBeenCalled();

    for (const invalidOptions of [null, undefined, "url", 1]) {
      expect(() => createBigWigFile(invalidOptions as never)).toThrow(TypeError);
    }
    for (const invalidUrl of ["/relative.bw", "ftp://example.test/basic.bw", 1]) {
      expect(() => createBigWigFile({ url: invalidUrl as never })).toThrow(TypeError);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns all committed source values from compressed and uncompressed fixtures", async () => {
    expect(parseBbiHeader(fixture).uncompressBufferSize).toBeGreaterThan(0);
    expect(parseBbiHeader(uncompressedFixture).uncompressBufferSize).toBe(0);

    for (const bytes of [fixture, uncompressedFixture]) {
      installFixtureFetch(bytes);
      const file = createBigWigFile({ url });
      const observed = [
        ...(await file.read({ chromosome: "chr1", start: 0, end: 12_000 })),
        ...(await file.read(
          { chromosome: "chr2", start: 0, end: 9_000 },
          { resolution: { mode: "unzoomed" } },
        )),
      ];
      expect(observed).toEqual(sourceRecords);

      await expect(file.read({ chromosome: "chr1", start: 1_000, end: 2_000 })).resolves.toEqual(
        recordsForRegion("chr1", 1_000, 2_000),
      );
      await expect(file.read({ chromosome: "chr1", start: 2_425, end: 5_000 })).resolves.toEqual(
        [],
      );
      await expect(file.read({ chromosome: "missing", start: 0, end: 100 })).resolves.toEqual([]);
    }
  });

  it("discovers levels and applies every automatic and exact selection boundary", async () => {
    installFixtureFetch();
    const file = createBigWigFile({ url });
    const region = { chromosome: "chr1", start: 0, end: 12_000 };
    const levels = [656, 2_624, 10_496, 41_984] as const;

    await expect(file.getZoomLevels()).resolves.toEqual(levels);
    const exact = new Map<number, BigWigRecord[]>();
    for (const reductionLevel of levels) {
      const records = await file.read(region, {
        resolution: { mode: "level", reductionLevel },
      });
      expect(records.length).toBeGreaterThan(0);
      expect(records.every((record) => record.kind === "summary")).toBe(true);
      exact.set(reductionLevel, records);
    }

    await expect(
      file.read(region, { resolution: { mode: "auto", basesPerPixel: 655 } }),
    ).resolves.toEqual(recordsForRegion("chr1", 0, 12_000));
    await expect(
      file.read(region, { resolution: { mode: "auto", basesPerPixel: 656 } }),
    ).resolves.toEqual(exact.get(656));
    await expect(
      file.read(region, { resolution: { mode: "auto", basesPerPixel: 2_000 } }),
    ).resolves.toEqual(exact.get(656));
    await expect(
      file.read(region, { resolution: { mode: "auto", basesPerPixel: 2_624 } }),
    ).resolves.toEqual(exact.get(2_624));
    await expect(
      file.read(region, { resolution: { mode: "auto", basesPerPixel: 100_000 } }),
    ).resolves.toEqual(exact.get(41_984));

    await expect(
      file.read(region, { resolution: { mode: "level", reductionLevel: 657 } }),
    ).rejects.toThrow("is not available");
  });

  it("preserves every stored zoom statistic and the exact query chromosome", async () => {
    for (const bytes of [fixture, uncompressedFixture]) {
      installFixtureFetch(bytes);
      const records = await createBigWigFile({ url }).read(
        { chromosome: "chr1", start: 0, end: 1_969 },
        { resolution: { mode: "level", reductionLevel: 656 } },
      );

      expect(records).toEqual([
        {
          kind: "summary",
          chromosome: "chr1",
          start: 0,
          end: 656,
          validCount: 281,
          min: -8,
          max: 7,
          sum: -6.25,
          sumSquares: 5_180.3125,
          mean: -6.25 / 281,
        },
        {
          kind: "summary",
          chromosome: "chr1",
          start: 656,
          end: 1_312,
          validCount: 236,
          min: -8,
          max: 7,
          sum: 316.25,
          sumSquares: 6_764.0625,
          mean: 316.25 / 236,
        },
        {
          kind: "summary",
          chromosome: "chr1",
          start: 1_312,
          end: 1_968,
          validCount: 283,
          min: -8,
          max: 7,
          sum: 36.25,
          sumSquares: 7_031.875,
          mean: 36.25 / 283,
        },
      ]);
    }
  });

  it("validates reads before fetching, handles files without zooms, and rejects wrong formats lazily", async () => {
    const fetchMock = installFixtureFetch();
    const file = createBigWigFile({ url });
    const validRegion = { chromosome: "chr1", start: 0, end: 100 };

    for (const coordinate of [NaN, Infinity, 0.5, "0"]) {
      await expect(file.read({ ...validRegion, start: coordinate as never })).rejects.toThrow(
        TypeError,
      );
    }
    for (const region of [
      { chromosome: "chr1", start: -1, end: 1 },
      { chromosome: "chr1", start: 1, end: 1 },
      { chromosome: "chr1", start: 2, end: 1 },
    ]) {
      await expect(file.read(region)).rejects.toThrow(RangeError);
    }
    for (const basesPerPixel of [NaN, Infinity, "1"]) {
      await expect(
        file.read(validRegion, {
          resolution: { mode: "auto", basesPerPixel: basesPerPixel as never },
        }),
      ).rejects.toThrow(TypeError);
    }
    await expect(
      file.read(validRegion, { resolution: { mode: "auto", basesPerPixel: 0 } }),
    ).rejects.toThrow(RangeError);
    for (const reductionLevel of [1.5, Infinity, "656"]) {
      await expect(
        file.read(validRegion, {
          resolution: { mode: "level", reductionLevel: reductionLevel as never },
        }),
      ).rejects.toThrow(TypeError);
    }
    await expect(
      file.read(validRegion, { resolution: { mode: "level", reductionLevel: 0 } }),
    ).rejects.toThrow(RangeError);
    expect(fetchMock).not.toHaveBeenCalled();

    const noZoomFixture = Uint8Array.from(fixture);
    new DataView(
      noZoomFixture.buffer,
      noZoomFixture.byteOffset,
      noZoomFixture.byteLength,
    ).setUint16(6, 0, true);
    installFixtureFetch(noZoomFixture);
    const noZoomFile = createBigWigFile({ url });
    await expect(noZoomFile.getZoomLevels()).resolves.toEqual([]);
    await expect(
      noZoomFile.read(validRegion, { resolution: { mode: "auto", basesPerPixel: 100_000 } }),
    ).resolves.toEqual(recordsForRegion("chr1", 0, 100));
    await expect(
      noZoomFile.read(validRegion, { resolution: { mode: "level", reductionLevel: 656 } }),
    ).rejects.toThrow("is not available");

    installFixtureFetch(bigBedFixture);
    const wrongFormatFile = createBigWigFile({ url });
    await expect(wrongFormatFile.getZoomLevels()).rejects.toThrow("Expected a BigWig file");
    await expect(wrongFormatFile.read(validRegion)).rejects.toThrow("Expected a BigWig file");
  });

  it("reuses only completed metadata while repeating index-node, block, decode, and result work", async () => {
    const fetchMock = installFixtureFetch();
    const file = createBigWigFile({ url });
    const header = parseBbiHeader(fixture);
    const zoomHeaders = parseBbiZoomHeaders(fixture.subarray(64, 64 + 24 * 4), header);
    const zoomRange = "bytes=64-159";
    const unzoomedIndexRange = `bytes=${header.unzoomedIndexOffset}-${header.unzoomedIndexOffset + 47n}`;
    const zoomIndexOffset = zoomHeaders[0]!.indexOffset;
    const zoomIndexRange = `bytes=${zoomIndexOffset}-${zoomIndexOffset + 47n}`;
    const region = { chromosome: "chr1", start: 0, end: 1_000 };

    await file.getZoomLevels();
    expect(requestedRanges(fetchMock)).toEqual(["bytes=0-63", zoomRange]);
    fetchMock.mockClear();
    await file.getZoomLevels();
    expect(fetchMock).not.toHaveBeenCalled();

    await file.read(region);
    const firstUnzoomedRanges = requestedRanges(fetchMock);
    const unzoomedIndexPosition = firstUnzoomedRanges.indexOf(unzoomedIndexRange);
    expect(unzoomedIndexPosition).toBeGreaterThan(0);
    const unzoomedQueryRanges = firstUnzoomedRanges.slice(unzoomedIndexPosition + 1);
    expect(unzoomedQueryRanges.length).toBeGreaterThan(1);
    fetchMock.mockClear();
    const firstResult = await file.read(region);
    expect(requestedRanges(fetchMock)).toEqual(unzoomedQueryRanges);
    const secondResult = await file.read(region);
    expect(secondResult).toEqual(firstResult);
    expect(secondResult).not.toBe(firstResult);
    expect(requestedRanges(fetchMock)).toEqual([...unzoomedQueryRanges, ...unzoomedQueryRanges]);

    fetchMock.mockClear();
    const zoomOptions = { resolution: { mode: "level", reductionLevel: 656 } } as const;
    await file.read(region, zoomOptions);
    const firstZoomRanges = requestedRanges(fetchMock);
    expect(firstZoomRanges[0]).toBe(zoomIndexRange);
    const zoomQueryRanges = firstZoomRanges.slice(1);
    expect(zoomQueryRanges.length).toBeGreaterThan(1);
    fetchMock.mockClear();
    await file.read(region, zoomOptions);
    expect(requestedRanges(fetchMock)).toEqual(zoomQueryRanges);

    fetchMock.mockClear();
    await expect(file.read({ chromosome: "missing", start: 0, end: 100 })).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalled();
    fetchMock.mockClear();
    await expect(file.read({ chromosome: "missing", start: 0, end: 100 })).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();

    await createBigWigFile({ url }).read(region, zoomOptions);
    expect(requestedRanges(fetchMock)[0]).toBe("bytes=0-63");
    expect(requestedRanges(fetchMock)).toContain(zoomRange);
    expect(requestedRanges(fetchMock)).toContain(zoomIndexRange);
  });

  it("retries failed and aborted metadata and keeps concurrent cancellation independent", async () => {
    const fetchMock = installFixtureFetch();
    const implementation = fetchMock.getMockImplementation()!;
    const headerFailure = new Error("transient header failure");
    fetchMock.mockRejectedValueOnce(headerFailure);
    const headerRetryFile = createBigWigFile({ url });
    await expect(headerRetryFile.getZoomLevels()).rejects.toBe(headerFailure);
    await expect(headerRetryFile.getZoomLevels()).resolves.toEqual([656, 2_624, 10_496, 41_984]);
    expect(requestedRanges(fetchMock).filter((range) => range === "bytes=0-63")).toHaveLength(2);

    fetchMock.mockClear();
    fetchMock.mockImplementation(implementation);
    const cancellationRetryFile = createBigWigFile({ url });
    await cancellationRetryFile.read({ chromosome: "missing", start: 0, end: 1 });
    fetchMock.mockClear();
    const controller = new AbortController();
    const reason = new DOMException("cancelled during zoom metadata", "AbortError");
    fetchMock.mockImplementation((input, init) => {
      if (new Headers(init?.headers).get("Range") === "bytes=64-159") controller.abort(reason);
      return implementation(input, init);
    });
    await expect(cancellationRetryFile.getZoomLevels({ signal: controller.signal })).rejects.toBe(
      reason,
    );
    fetchMock.mockClear();
    fetchMock.mockImplementation(implementation);
    await expect(cancellationRetryFile.getZoomLevels()).resolves.toEqual([
      656, 2_624, 10_496, 41_984,
    ]);
    expect(requestedRanges(fetchMock)).toEqual(["bytes=64-159"]);

    const concurrentFile = createBigWigFile({ url });
    await concurrentFile.read({ chromosome: "missing", start: 0, end: 1 });
    fetchMock.mockClear();
    const concurrentController = new AbortController();
    const concurrentReason = new DOMException("cancelled concurrent discovery", "AbortError");
    const cancelledDiscovery = concurrentFile.getZoomLevels({
      signal: concurrentController.signal,
    });
    const activeDiscovery = concurrentFile.getZoomLevels();
    await Promise.resolve();
    concurrentController.abort(concurrentReason);
    const [cancelledResult, activeResult] = await Promise.allSettled([
      cancelledDiscovery,
      activeDiscovery,
    ]);
    expect(cancelledResult).toEqual({ status: "rejected", reason: concurrentReason });
    expect(activeResult).toEqual({ status: "fulfilled", value: [656, 2_624, 10_496, 41_984] });
    expect(requestedRanges(fetchMock).filter((range) => range === "bytes=64-159")).toHaveLength(2);

    fetchMock.mockClear();
    const preAbortedController = new AbortController();
    const preAbortedReason = new DOMException("already cancelled", "AbortError");
    preAbortedController.abort(preAbortedReason);
    await expect(
      concurrentFile.read(
        { chromosome: "chr1", start: 0, end: 100 },
        { signal: preAbortedController.signal },
      ),
    ).rejects.toBe(preAbortedReason);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
