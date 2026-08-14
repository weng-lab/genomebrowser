import { zlibSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupChromosome } from "../src/internal/bbi/chromosomeTree";
import { parseBbiHeader, readBbiHeader, type BbiHeader } from "../src/internal/bbi/commonHeader";
import { readBbiDataBlocks } from "../src/internal/bbi/dataBlocks";
import { findPrimaryDataBlocks, readPrimaryRTreeHeader } from "../src/internal/bbi/regionalIndex";
import { parseBbiZoomHeaders, readBbiZoomHeaders } from "../src/internal/bbi/zoomHeaders";
import type { ByteOrder } from "../src/internal/binaryReader";

const decompressionControl = vi.hoisted(() => ({
  afterDecompression: undefined as (() => void) | undefined,
}));

vi.mock("fflate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fflate")>();
  return {
    ...actual,
    unzlibSync(data: Uint8Array, options?: { dictionary?: Uint8Array; out?: Uint8Array }) {
      const output = actual.unzlibSync(data, options);
      decompressionControl.afterDecompression?.();
      return output;
    },
  };
});

const url = "https://example.test/synthetic.bb";
const bigBedMagic = 0x8789f2eb;
const bigWigMagic = 0x888ffc26;
const bPlusTreeMagic = 0x78ca8c91;
const cirTreeMagic = 0x2468ace0;
const encoder = new TextEncoder();

async function readUncachedBbiDataBlocks(
  sourceUrl: string,
  header: BbiHeader,
  query: { chromosomeId: number; start: number; end: number },
  signal?: AbortSignal,
) {
  const options = { signal, metadata: {} };
  const tree = await readPrimaryRTreeHeader(sourceUrl, header, header.unzoomedIndexOffset, options);
  return readBbiDataBlocks(sourceUrl, header, tree, query, options);
}

function littleEndian(byteOrder: ByteOrder): boolean {
  return byteOrder === "little-endian";
}

function makeBigBedHeader(
  byteOrder: ByteOrder,
  overrides: Partial<{
    chromosomeTreeOffset: bigint;
    unzoomedIndexOffset: bigint;
    uncompressBufferSize: number;
    zoomLevelCount: number;
  }> = {},
): Uint8Array {
  const bytes = new Uint8Array(64);
  const view = new DataView(bytes.buffer);
  const little = littleEndian(byteOrder);
  view.setUint32(0, bigBedMagic, little);
  view.setUint16(4, 4, little);
  view.setUint16(6, overrides.zoomLevelCount ?? 0xffff, little);
  view.setBigUint64(8, overrides.chromosomeTreeOffset ?? 0x20_0000_0000_0001n, little);
  view.setBigUint64(16, 0x30_0000_0000_0002n, little);
  view.setBigUint64(24, overrides.unzoomedIndexOffset ?? 0x40_0000_0000_0003n, little);
  view.setUint16(32, 0xffff, little);
  view.setUint16(34, 0xfffe, little);
  view.setBigUint64(36, 0x50_0000_0000_0004n, little);
  view.setBigUint64(44, 0x60_0000_0000_0005n, little);
  view.setUint32(52, overrides.uncompressBufferSize ?? 0xffffffff, little);
  view.setBigUint64(56, 0x70_0000_0000_0006n, little);
  return bytes;
}

function makeZoomHeaders(
  byteOrder: ByteOrder,
  zoomHeaders: Array<{ reductionLevel: number; dataOffset: bigint; indexOffset: bigint }>,
): Uint8Array {
  const bytes = new Uint8Array(zoomHeaders.length * 24);
  const view = new DataView(bytes.buffer);
  const little = littleEndian(byteOrder);

  for (const [index, zoomHeader] of zoomHeaders.entries()) {
    const offset = index * 24;
    view.setUint32(offset, zoomHeader.reductionLevel, little);
    view.setUint32(offset + 4, 0xa5a5a5a5, little);
    view.setBigUint64(offset + 8, zoomHeader.dataOffset, little);
    view.setBigUint64(offset + 16, zoomHeader.indexOffset, little);
  }

  return bytes;
}

function makeTreeHeader(
  byteOrder: ByteOrder,
  keySize: number,
  itemCount: bigint,
  blockSize = 3,
): Uint8Array {
  const bytes = new Uint8Array(32);
  const view = new DataView(bytes.buffer);
  const little = littleEndian(byteOrder);
  view.setUint32(0, bPlusTreeMagic, little);
  view.setUint32(4, blockSize, little);
  view.setUint32(8, keySize, little);
  view.setUint32(12, 8, little);
  view.setBigUint64(16, itemCount, little);
  return bytes;
}

type IndexedItem = {
  startChromosomeId: number;
  startBase: number;
  endChromosomeId: number;
  endBase: number;
  offset: bigint;
  size?: bigint;
};

function makeCirTreeHeader(byteOrder: ByteOrder, blockSize: number, itemCount: bigint): Uint8Array {
  const bytes = new Uint8Array(48);
  const view = new DataView(bytes.buffer);
  const little = littleEndian(byteOrder);
  view.setUint32(0, cirTreeMagic, little);
  view.setUint32(4, blockSize, little);
  view.setBigUint64(8, itemCount, little);
  view.setUint32(16, 1, little);
  view.setUint32(20, 10, little);
  view.setUint32(24, 3, little);
  view.setUint32(28, 500, little);
  view.setBigUint64(32, 0xffff_ffff_ffff_ffffn, little);
  view.setUint32(40, 1, little);
  return bytes;
}

function makeCirTreeNode(byteOrder: ByteOrder, isLeaf: boolean, items: IndexedItem[]): Uint8Array {
  const itemSize = isLeaf ? 32 : 24;
  const bytes = new Uint8Array(4 + itemSize * items.length);
  const view = new DataView(bytes.buffer);
  const little = littleEndian(byteOrder);
  bytes[0] = isLeaf ? 1 : 0;
  view.setUint16(2, items.length, little);

  let offset = 4;
  for (const item of items) {
    view.setUint32(offset, item.startChromosomeId, little);
    view.setUint32(offset + 4, item.startBase, little);
    view.setUint32(offset + 8, item.endChromosomeId, little);
    view.setUint32(offset + 12, item.endBase, little);
    view.setBigUint64(offset + 16, item.offset, little);
    if (isLeaf) view.setBigUint64(offset + 24, item.size ?? 0n, little);
    offset += itemSize;
  }
  return bytes;
}

function writeKey(bytes: Uint8Array, offset: number, keySize: number, key: string): number {
  const encoded = encoder.encode(key);
  bytes.set(encoded, offset);
  return offset + keySize;
}

function makeInternalNode(
  byteOrder: ByteOrder,
  keySize: number,
  items: Array<[key: string, childOffset: bigint]>,
): Uint8Array {
  const bytes = new Uint8Array(4 + items.length * (keySize + 8));
  const view = new DataView(bytes.buffer);
  const little = littleEndian(byteOrder);
  bytes[0] = 0;
  view.setUint16(2, items.length, little);
  let offset = 4;
  for (const [key, childOffset] of items) {
    offset = writeKey(bytes, offset, keySize, key);
    view.setBigUint64(offset, childOffset, little);
    offset += 8;
  }
  return bytes;
}

function makeLeafNode(
  byteOrder: ByteOrder,
  keySize: number,
  items: Array<[key: string, id: number, size: number]>,
): Uint8Array {
  const bytes = new Uint8Array(4 + items.length * (keySize + 8));
  const view = new DataView(bytes.buffer);
  const little = littleEndian(byteOrder);
  bytes[0] = 1;
  view.setUint16(2, items.length, little);
  let offset = 4;
  for (const [key, id, size] of items) {
    offset = writeKey(bytes, offset, keySize, key);
    view.setUint32(offset, id, little);
    view.setUint32(offset + 4, size, little);
    offset += 8;
  }
  return bytes;
}

function installRangeSource(
  chunks: Map<bigint, Uint8Array>,
  options: { exposeContentRange?: boolean } = {},
): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
    const range = new Headers(init?.headers).get("Range");
    const match = /^bytes=(\d+)-(\d+)$/.exec(range ?? "");
    if (match === null) throw new Error(`Unexpected range header: ${range}`);
    const start = BigInt(match[1]);
    const end = BigInt(match[2]);
    const chunk = chunks.get(start);
    if (chunk === undefined || BigInt(chunk.byteLength) > end - start + 1n) {
      throw new Error(`Unexpected byte request: ${range}`);
    }
    const responseEnd = start + BigInt(chunk.byteLength) - 1n;
    return Promise.resolve(
      new Response(chunk.slice(), {
        status: 206,
        headers:
          options.exposeContentRange === false
            ? undefined
            : { "Content-Range": `bytes ${start}-${responseEnd}/*` },
      }),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function installContiguousRangeSource(bytes: Uint8Array): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
    const range = new Headers(init?.headers).get("Range");
    const match = /^bytes=(\d+)-(\d+)$/.exec(range ?? "");
    if (match === null) throw new Error(`Unexpected range header: ${range}`);
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= bytes.byteLength) {
      throw new Error(`Unexpected byte request: ${range}`);
    }
    const responseEnd = Math.min(end, bytes.byteLength - 1);
    return Promise.resolve(
      new Response(bytes.slice(start, responseEnd + 1), {
        status: 206,
        headers: { "Content-Range": `bytes ${start}-${responseEnd}/${bytes.byteLength}` },
      }),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestedRanges(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>): string[] {
  return fetchMock.mock.calls.map(([, init]) => new Headers(init?.headers).get("Range") ?? "");
}

type DataBlockFixture = {
  resource: Uint8Array;
  header: BbiHeader;
  query: { chromosomeId: number; start: number; end: number };
  blockOffsets: bigint[];
};

function makeDataBlockFixture(
  blockBytes: readonly Uint8Array[],
  blockOffsets: readonly bigint[],
  byteOrder: ByteOrder = "little-endian",
  uncompressBufferSize = 0,
): DataBlockFixture {
  if (blockBytes.length !== blockOffsets.length) {
    throw new Error("Data block fixture lengths do not match");
  }

  const indexOffset = 100n;
  const rootOffset = indexOffset + 48n;
  const leaf = makeCirTreeNode(
    byteOrder,
    true,
    blockBytes.map((bytes, index) => ({
      startChromosomeId: 2,
      startBase: 10,
      endChromosomeId: 2,
      endBase: 20,
      offset: blockOffsets[index]!,
      size: BigInt(bytes.byteLength),
    })),
  );
  const resourceLength = Math.max(
    Number(rootOffset) + leaf.byteLength,
    ...blockBytes.map((bytes, index) => Number(blockOffsets[index]!) + bytes.byteLength),
  );
  const resource = new Uint8Array(resourceLength);
  resource.set(makeCirTreeHeader(byteOrder, blockBytes.length, BigInt(blockBytes.length)), 100);
  resource.set(leaf, Number(rootOffset));
  blockBytes.forEach((bytes, index) => resource.set(bytes, Number(blockOffsets[index]!)));

  const header = parseBbiHeader(
    makeBigBedHeader(byteOrder, {
      uncompressBufferSize,
      unzoomedIndexOffset: indexOffset,
    }),
  );
  return {
    resource,
    header,
    query: { chromosomeId: 2, start: 10, end: 20 },
    blockOffsets: [...blockOffsets],
  };
}

afterEach(() => {
  decompressionControl.afterDecompression = undefined;
  vi.unstubAllGlobals();
});

describe("BBI common header", () => {
  it.each<ByteOrder>(["little-endian", "big-endian"])(
    "parses the complete BigBed header in %s order without narrowing unsigned values",
    (byteOrder) => {
      expect(parseBbiHeader(makeBigBedHeader(byteOrder))).toEqual({
        format: "bigBed",
        byteOrder,
        version: 4,
        zoomLevelCount: 0xffff,
        chromosomeTreeOffset: 0x20_0000_0000_0001n,
        unzoomedDataOffset: 0x30_0000_0000_0002n,
        unzoomedIndexOffset: 0x40_0000_0000_0003n,
        fieldCount: 0xffff,
        definedFieldCount: 0xfffe,
        autoSqlOffset: 0x50_0000_0000_0004n,
        totalSummaryOffset: 0x60_0000_0000_0005n,
        uncompressBufferSize: 0xffffffff,
        extensionOffset: 0x70_0000_0000_0006n,
      });
    },
  );

  it("identifies supported BBI formats and rejects unknown magic or truncated fields", () => {
    const bigWigHeader = makeBigBedHeader("little-endian");
    new DataView(bigWigHeader.buffer).setUint32(0, bigWigMagic, true);
    expect(parseBbiHeader(bigWigHeader).format).toBe("bigWig");
    expect(() => parseBbiHeader(new Uint8Array(64))).toThrow("Unsupported BBI container magic");
    expect(() => parseBbiHeader(makeBigBedHeader("little-endian").subarray(0, 63))).toThrow(
      RangeError,
    );
  });
});

describe("BBI zoom headers", () => {
  it.each<ByteOrder>(["little-endian", "big-endian"])(
    "reads every declared header in file order with unsigned offsets in %s order",
    async (byteOrder) => {
      const expected = [
        {
          reductionLevel: 16,
          dataOffset: 9_007_199_254_740_993n,
          indexOffset: 0xffff_ffff_ffff_ff00n,
        },
        {
          reductionLevel: 0xffff_ffff,
          dataOffset: 0x1234_5678_9abc_def0n,
          indexOffset: 0xfedc_ba98_7654_3210n,
        },
      ];
      const header = parseBbiHeader(
        makeBigBedHeader(byteOrder, { zoomLevelCount: expected.length }),
      );
      const bytes = makeZoomHeaders(byteOrder, expected);
      const fetchMock = installRangeSource(new Map([[64n, bytes]]));

      expect(parseBbiZoomHeaders(bytes, header)).toEqual(expected);
      await expect(readBbiZoomHeaders(url, header)).resolves.toEqual(expected);
      expect(requestedRanges(fetchMock)).toEqual(["bytes=64-111"]);
    },
  );

  it("handles zero and one declared header and rejects a truncated declared sequence", async () => {
    const byteOrder = "little-endian";
    const onlyZoomHeader = [{ reductionLevel: 4, dataOffset: 0x1234n, indexOffset: 0x5678n }];
    const bytes = makeZoomHeaders(byteOrder, onlyZoomHeader);
    const zeroHeader = parseBbiHeader(makeBigBedHeader(byteOrder, { zoomLevelCount: 0 }));
    const oneHeader = parseBbiHeader(makeBigBedHeader(byteOrder, { zoomLevelCount: 1 }));
    const twoHeader = parseBbiHeader(makeBigBedHeader(byteOrder, { zoomLevelCount: 2 }));
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    expect(parseBbiZoomHeaders(new Uint8Array(), zeroHeader)).toEqual([]);
    await expect(readBbiZoomHeaders(url, zeroHeader)).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(parseBbiZoomHeaders(bytes, oneHeader)).toEqual(onlyZoomHeader);
    expect(() => parseBbiZoomHeaders(bytes, twoHeader)).toThrow(RangeError);
  });
});

describe("lazy chromosome B+ tree lookup", () => {
  it.each<ByteOrder>(["little-endian", "big-endian"])(
    "follows padded separators through only the selected absolute branch in %s order",
    async (byteOrder) => {
      const treeOffset = 4096n;
      const rootOffset = treeOffset + 32n;
      const middleOffset = 12_000n;
      const leafOffset = 20_000n;
      const keySize = 8;
      const headerBytes = makeBigBedHeader(byteOrder, { chromosomeTreeOffset: treeOffset });
      const root = makeInternalNode(byteOrder, keySize, [
        ["chr1", 9_000n],
        ["chrM", middleOffset],
        ["chrZ", 15_000n],
      ]);
      const middle = makeInternalNode(byteOrder, keySize, [
        ["chrM", leafOffset],
        ["chrN", 21_000n],
      ]);
      const leaf = makeLeafNode(byteOrder, keySize, [
        ["chrM", 0xfedcba98, 0xffffffff],
        ["chrM2", 7, 12_345],
      ]);
      const chunks = new Map<bigint, Uint8Array>([
        [0n, headerBytes],
        [treeOffset, makeTreeHeader(byteOrder, keySize, 4n)],
        [rootOffset, root],
        [middleOffset, middle],
        [leafOffset, leaf],
      ]);
      const fetchMock = installRangeSource(chunks);

      const header = await readBbiHeader(url);
      await expect(lookupChromosome(url, header, "chrM2")).resolves.toEqual({
        id: 7,
        size: 12_345,
      });
      expect(requestedRanges(fetchMock)).toEqual([
        "bytes=0-63",
        "bytes=4096-4127",
        "bytes=4128-4179",
        "bytes=12000-12051",
        "bytes=20000-20051",
      ]);
      expect(requestedRanges(fetchMock)).not.toContain("bytes=9000-9003");
      expect(requestedRanges(fetchMock)).not.toContain("bytes=15000-15003");
      expect(requestedRanges(fetchMock)).not.toContain("bytes=21000-21003");
    },
  );

  it("returns no match from the directed leaf and repeats all work in a separate lookup", async () => {
    const byteOrder = "little-endian";
    const treeOffset = 4096n;
    const rootOffset = treeOffset + 32n;
    const leafOffset = 21_000n;
    const keySize = 8;
    const headerBytes = makeBigBedHeader(byteOrder, { chromosomeTreeOffset: treeOffset });
    const root = makeInternalNode(byteOrder, keySize, [
      ["chr1", 9_000n],
      ["chrN", leafOffset],
      ["chrZ", 15_000n],
    ]);
    const leaf = makeLeafNode(byteOrder, keySize, [["chrN1", 9, 99]]);
    const chunks = new Map<bigint, Uint8Array>([
      [0n, headerBytes],
      [treeOffset, makeTreeHeader(byteOrder, keySize, 1n)],
      [rootOffset, root],
      [leafOffset, leaf],
    ]);
    const fetchMock = installRangeSource(chunks);

    for (let read = 0; read < 2; read += 1) {
      const header: BbiHeader = await readBbiHeader(url);
      await expect(lookupChromosome(url, header, "chrN")).resolves.toBeUndefined();
    }

    const oneRead = ["bytes=0-63", "bytes=4096-4127", "bytes=4128-4179", "bytes=21000-21051"];
    expect(requestedRanges(fetchMock)).toEqual([...oneRead, ...oneRead]);
    expect(requestedRanges(fetchMock)).not.toContain("bytes=9000-9003");
    expect(requestedRanges(fetchMock)).not.toContain("bytes=15000-15003");
  });

  it("reads an EOF-short node without visible Content-Range", async () => {
    const byteOrder = "little-endian";
    const treeOffset = 64n;
    const rootOffset = treeOffset + 32n;
    const keySize = 8;
    const leaf = makeLeafNode(byteOrder, keySize, [["chrM", 7, 16_569]]);
    const resource = new Uint8Array(Number(rootOffset) + leaf.byteLength);
    resource.set(makeTreeHeader(byteOrder, keySize, 1n), Number(treeOffset));
    resource.set(leaf, Number(rootOffset));
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
      const range = new Headers(init?.headers).get("Range") ?? "";
      const match = /^bytes=(\d+)-(\d+)$/.exec(range);
      if (match === null) throw new Error(`Unexpected range header: ${range}`);
      const start = Number(match[1]);
      const end = Number(match[2]);
      return Promise.resolve(
        new Response(resource.slice(start, Math.min(end + 1, resource.byteLength)), {
          status: 206,
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const header = parseBbiHeader(
      makeBigBedHeader(byteOrder, { chromosomeTreeOffset: treeOffset }),
    );

    await expect(lookupChromosome(url, header, "chrM")).resolves.toEqual({
      id: 7,
      size: 16_569,
    });
    expect(requestedRanges(fetchMock)).toEqual(["bytes=64-95", "bytes=96-147"]);
  });

  it("rejects oversized and truncated B+ tree node declarations", async () => {
    const byteOrder = "little-endian";
    const treeOffset = 64n;
    const rootOffset = treeOffset + 32n;
    const keySize = 8;
    const header = parseBbiHeader(
      makeBigBedHeader(byteOrder, { chromosomeTreeOffset: treeOffset }),
    );
    const oversizedHeader = new Uint8Array(4);
    oversizedHeader[0] = 1;
    new DataView(oversizedHeader.buffer).setUint16(2, 2, true);
    installRangeSource(
      new Map([
        [treeOffset, makeTreeHeader(byteOrder, keySize, 1n, 1)],
        [rootOffset, oversizedHeader],
      ]),
    );
    await expect(lookupChromosome(url, header, "chrM")).rejects.toThrow(
      "node exceeds its block size",
    );

    const truncatedLeaf = makeLeafNode(byteOrder, keySize, [["chrM", 7, 16_569]]).subarray(0, -1);
    installRangeSource(
      new Map([
        [treeOffset, makeTreeHeader(byteOrder, keySize, 1n)],
        [rootOffset, truncatedLeaf],
      ]),
    );
    await expect(lookupChromosome(url, header, "chrM")).rejects.toThrow("node body is truncated");
  });

  it("falls back to exact node reads when the maximum B+ tree node span exceeds the limit", async () => {
    const byteOrder = "little-endian";
    const treeOffset = 64n;
    const rootOffset = treeOffset + 32n;
    const keySize = 8;
    const leaf = makeLeafNode(byteOrder, keySize, [["chrM", 7, 16_569]]);
    const fetchMock = installRangeSource(
      new Map([
        [treeOffset, makeTreeHeader(byteOrder, keySize, 1n, 65_536)],
        [rootOffset, leaf.subarray(0, 4)],
        [rootOffset + 4n, leaf.subarray(4)],
      ]),
    );
    const header = parseBbiHeader(
      makeBigBedHeader(byteOrder, { chromosomeTreeOffset: treeOffset }),
    );

    await expect(lookupChromosome(url, header, "chrM")).resolves.toEqual({
      id: 7,
      size: 16_569,
    });
    expect(requestedRanges(fetchMock)).toEqual(["bytes=64-95", "bytes=96-99", "bytes=100-115"]);
  });
});

describe("lazy primary R-tree traversal and BBI block retrieval", () => {
  it("loads and traverses caller-selected unzoomed and zoom indexes", async () => {
    const byteOrder = "little-endian";
    const unzoomedIndexOffset = 4096n;
    const zoomIndexOffset = 8000n;
    const unzoomedBlockOffset = 12_000n;
    const zoomBlockOffset = 13_000n;
    const unzoomedBytes = Uint8Array.of(1, 2);
    const zoomBytes = Uint8Array.of(3, 4, 5);
    const makeLeaf = (blockOffset: bigint, size: number) =>
      makeCirTreeNode(byteOrder, true, [
        {
          startChromosomeId: 2,
          startBase: 10,
          endChromosomeId: 2,
          endBase: 20,
          offset: blockOffset,
          size: BigInt(size),
        },
      ]);
    const unzoomedLeaf = makeLeaf(unzoomedBlockOffset, unzoomedBytes.byteLength);
    const zoomLeaf = makeLeaf(zoomBlockOffset, zoomBytes.byteLength);
    const fetchMock = installRangeSource(
      new Map([
        [unzoomedIndexOffset, makeCirTreeHeader(byteOrder, 1, 1n)],
        [unzoomedIndexOffset + 48n, unzoomedLeaf],
        [zoomIndexOffset, makeCirTreeHeader(byteOrder, 1, 1n)],
        [zoomIndexOffset + 48n, zoomLeaf],
        [unzoomedBlockOffset, unzoomedBytes],
        [zoomBlockOffset, zoomBytes],
      ]),
    );
    const header = parseBbiHeader(
      makeBigBedHeader(byteOrder, { uncompressBufferSize: 0, unzoomedIndexOffset }),
    );
    const query = { chromosomeId: 2, start: 10, end: 20 };

    const unzoomedTree = await readPrimaryRTreeHeader(url, header, unzoomedIndexOffset);
    const zoomTree = await readPrimaryRTreeHeader(url, header, zoomIndexOffset);

    expect(unzoomedTree.indexOffset).toBe(unzoomedIndexOffset);
    expect(zoomTree.indexOffset).toBe(zoomIndexOffset);
    await expect(readBbiDataBlocks(url, header, unzoomedTree, query)).resolves.toEqual([
      {
        bytes: unzoomedBytes,
        offset: unzoomedBlockOffset,
        size: BigInt(unzoomedBytes.byteLength),
        query,
      },
    ]);
    await expect(readBbiDataBlocks(url, header, zoomTree, query)).resolves.toEqual([
      {
        bytes: zoomBytes,
        offset: zoomBlockOffset,
        size: BigInt(zoomBytes.byteLength),
        query,
      },
    ]);
    expect(requestedRanges(fetchMock)).toEqual([
      "bytes=4096-4143",
      "bytes=8000-8047",
      "bytes=4144-4179",
      "bytes=12000-12001",
      "bytes=8048-8083",
      "bytes=13000-13002",
    ]);
  });

  it("clamps known-size read-ahead and preserves cancellation, retry, and boundary checks", async () => {
    const byteOrder = "little-endian";
    const indexOffset = 100n;
    const rootOffset = indexOffset + 48n;
    const leafOffset = 420n;
    const resource = new Uint8Array(456).fill(0xa5);
    resource.set(makeCirTreeHeader(byteOrder, 2, 1n), Number(indexOffset));
    resource.set(
      makeCirTreeNode(byteOrder, false, [
        {
          startChromosomeId: 2,
          startBase: 0,
          endChromosomeId: 2,
          endBase: 100,
          offset: leafOffset,
        },
      ]),
      Number(rootOffset),
    );
    resource.set(
      makeCirTreeNode(byteOrder, true, [
        {
          startChromosomeId: 2,
          startBase: 10,
          endChromosomeId: 2,
          endBase: 20,
          offset: 300n,
          size: 3n,
        },
      ]),
      Number(leafOffset),
    );
    const fetchMock = installContiguousRangeSource(resource);
    const header = parseBbiHeader(makeBigBedHeader(byteOrder, { uncompressBufferSize: 0 }));
    header.unzoomedIndexOffset = indexOffset;
    const metadata: { resourceSize?: bigint } = {};
    const options = { metadata };
    const tree = await readPrimaryRTreeHeader(url, header, header.unzoomedIndexOffset, options);
    expect(metadata.resourceSize).toBe(BigInt(resource.byteLength));

    const query = { chromosomeId: 2, start: 10, end: 20 };
    await expect(findPrimaryDataBlocks(url, header, tree, query, options)).resolves.toEqual([
      { offset: 300n, size: 3n },
    ]);

    const implementation = fetchMock.getMockImplementation()!;
    const controller = new AbortController();
    const reason = new DOMException("cancelled during R-tree read-ahead", "AbortError");
    fetchMock.mockImplementation((input, init) => {
      if (new Headers(init?.headers).get("Range") === "bytes=148-215") {
        controller.abort(reason);
      }
      return implementation(input, init);
    });
    await expect(
      findPrimaryDataBlocks(url, header, tree, query, { metadata, signal: controller.signal }),
    ).rejects.toBe(reason);

    fetchMock.mockImplementation(implementation);
    await expect(findPrimaryDataBlocks(url, header, tree, query, options)).resolves.toEqual([
      { offset: 300n, size: 3n },
    ]);

    expect(requestedRanges(fetchMock)).toEqual([
      "bytes=100-147",
      "bytes=148-215",
      "bytes=420-455",
      "bytes=148-215",
      "bytes=148-215",
      "bytes=420-455",
    ]);

    fetchMock.mockClear();
    await expect(
      findPrimaryDataBlocks(
        url,
        header,
        { ...tree, rootOffset: BigInt(resource.byteLength) },
        query,
        options,
      ),
    ).rejects.toThrow("node offset is outside the resource");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to exact reads when maximum node span exceeds the limit", async () => {
    const byteOrder = "little-endian";
    const indexOffset = 100n;
    const rootOffset = indexOffset + 48n;
    const resource = new Uint8Array(300);
    resource.set(makeCirTreeHeader(byteOrder, 32_768, 1n), Number(indexOffset));
    resource.set(
      makeCirTreeNode(byteOrder, true, [
        {
          startChromosomeId: 2,
          startBase: 10,
          endChromosomeId: 2,
          endBase: 20,
          offset: 250n,
          size: 3n,
        },
      ]),
      Number(rootOffset),
    );
    const fetchMock = installContiguousRangeSource(resource);
    const header = parseBbiHeader(makeBigBedHeader(byteOrder, { uncompressBufferSize: 0 }));
    header.unzoomedIndexOffset = indexOffset;
    const metadata: { resourceSize?: bigint } = {};
    const options = { metadata };
    const tree = await readPrimaryRTreeHeader(url, header, header.unzoomedIndexOffset, options);

    await expect(
      findPrimaryDataBlocks(url, header, tree, { chromosomeId: 2, start: 10, end: 20 }, options),
    ).resolves.toEqual([{ offset: 250n, size: 3n }]);
    expect(requestedRanges(fetchMock)).toEqual(["bytes=100-147", "bytes=148-151", "bytes=152-183"]);
  });

  it("fetches only the exact missing suffix for a node larger than the initial read budget", async () => {
    const byteOrder = "little-endian";
    const indexOffset = 100n;
    const rootOffset = indexOffset + 48n;
    const items = Array.from({ length: 256 }, (_, index) => ({
      startChromosomeId: 2,
      startBase: index * 10,
      endChromosomeId: 2,
      endBase: index * 10 + 5,
      offset: 20_000n + BigInt(index),
      size: 1n,
    }));
    const leaf = makeCirTreeNode(byteOrder, true, items);
    const prefixLength = 4096;
    const prefix = leaf.subarray(0, prefixLength);
    const suffix = leaf.subarray(prefixLength);
    const fetchMock = installRangeSource(
      new Map([
        [indexOffset, makeCirTreeHeader(byteOrder, items.length, BigInt(items.length))],
        [rootOffset, prefix],
        [rootOffset + BigInt(prefixLength), suffix],
      ]),
    );
    const header = parseBbiHeader(makeBigBedHeader(byteOrder, { uncompressBufferSize: 0 }));
    header.unzoomedIndexOffset = indexOffset;
    const tree = await readPrimaryRTreeHeader(url, header, indexOffset);

    await expect(
      findPrimaryDataBlocks(url, header, tree, {
        chromosomeId: 2,
        start: 1270,
        end: 1275,
      }),
    ).resolves.toEqual([{ offset: 20_127n, size: 1n }]);
    expect(requestedRanges(fetchMock)).toEqual([
      "bytes=100-147",
      "bytes=148-4243",
      "bytes=4244-8343",
    ]);

    const truncatedFetchMock = installRangeSource(
      new Map([
        [rootOffset, prefix],
        [rootOffset + BigInt(prefixLength), suffix.subarray(0, -1)],
      ]),
      { exposeContentRange: false },
    );
    await expect(
      findPrimaryDataBlocks(url, header, tree, {
        chromosomeId: 2,
        start: 1270,
        end: 1275,
      }),
    ).rejects.toThrow("expected exactly 4100");
    expect(requestedRanges(truncatedFetchMock)).toEqual(["bytes=148-4243", "bytes=4244-8343"]);
  });

  it("rejects an oversized declared count from a known-size read-ahead node", async () => {
    const byteOrder = "little-endian";
    const indexOffset = 100n;
    const rootOffset = indexOffset + 48n;
    const resource = new Uint8Array(184);
    resource.set(makeCirTreeHeader(byteOrder, 1, 1n), Number(indexOffset));
    const nodeHeader = new Uint8Array(4);
    nodeHeader[0] = 1;
    new DataView(nodeHeader.buffer).setUint16(2, 2, true);
    resource.set(nodeHeader, Number(rootOffset));
    const fetchMock = installContiguousRangeSource(resource);
    const header = parseBbiHeader(makeBigBedHeader(byteOrder, { uncompressBufferSize: 0 }));
    header.unzoomedIndexOffset = indexOffset;
    const metadata: { resourceSize?: bigint } = {};
    const options = { metadata };
    const tree = await readPrimaryRTreeHeader(url, header, header.unzoomedIndexOffset, options);

    await expect(
      findPrimaryDataBlocks(url, header, tree, { chromosomeId: 2, start: 10, end: 20 }, options),
    ).rejects.toThrow("node exceeds its block size");
    expect(requestedRanges(fetchMock)).toEqual(["bytes=100-147", "bytes=148-183"]);
  });

  it("rejects a malformed visible range for a bounded node response", async () => {
    const byteOrder = "little-endian";
    const indexOffset = 100n;
    const rootOffset = indexOffset + 48n;
    const leaf = makeCirTreeNode(byteOrder, true, [
      {
        startChromosomeId: 2,
        startBase: 10,
        endChromosomeId: 2,
        endBase: 20,
        offset: 250n,
        size: 3n,
      },
    ]);
    const fetchMock = installRangeSource(
      new Map([
        [indexOffset, makeCirTreeHeader(byteOrder, 1, 1n)],
        [rootOffset, leaf],
      ]),
    );
    const implementation = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((input, init) => {
      if (new Headers(init?.headers).get("Range") === "bytes=148-183") {
        return Promise.resolve(
          new Response(leaf.slice(), {
            status: 206,
            headers: { "Content-Range": "bytes invalid" },
          }),
        );
      }
      return implementation(input, init);
    });
    const header = parseBbiHeader(makeBigBedHeader(byteOrder, { uncompressBufferSize: 0 }));
    header.unzoomedIndexOffset = indexOffset;
    const tree = await readPrimaryRTreeHeader(url, header, indexOffset);

    await expect(
      findPrimaryDataBlocks(url, header, tree, { chromosomeId: 2, start: 10, end: 20 }),
    ).rejects.toThrow("invalid Content-Range");
    expect(requestedRanges(fetchMock)).toEqual(["bytes=100-147", "bytes=148-183"]);
  });

  it("rejects a known-size node whose EOF-capped span truncates its declared body", async () => {
    const byteOrder = "little-endian";
    const indexOffset = 100n;
    const rootOffset = indexOffset + 48n;
    const resource = new Uint8Array(184);
    resource.set(makeCirTreeHeader(byteOrder, 2, 1n), Number(indexOffset));
    const completeNode = makeCirTreeNode(byteOrder, true, [
      {
        startChromosomeId: 2,
        startBase: 10,
        endChromosomeId: 2,
        endBase: 20,
        offset: 250n,
        size: 3n,
      },
      {
        startChromosomeId: 2,
        startBase: 30,
        endChromosomeId: 2,
        endBase: 40,
        offset: 260n,
        size: 4n,
      },
    ]);
    resource.set(completeNode.subarray(0, 36), Number(rootOffset));
    const fetchMock = installContiguousRangeSource(resource);
    const header = parseBbiHeader(makeBigBedHeader(byteOrder, { uncompressBufferSize: 0 }));
    header.unzoomedIndexOffset = indexOffset;
    const metadata: { resourceSize?: bigint } = {};
    const options = { metadata };
    const tree = await readPrimaryRTreeHeader(url, header, header.unzoomedIndexOffset, options);

    await expect(
      findPrimaryDataBlocks(url, header, tree, { chromosomeId: 2, start: 0, end: 50 }, options),
    ).rejects.toThrow("node body is truncated");
    expect(requestedRanges(fetchMock)).toEqual(["bytes=100-147", "bytes=148-183"]);
  });

  it.each<ByteOrder>(["little-endian", "big-endian"])(
    "uses unsigned %s index values, pairwise overlap, and bounded reads with hidden ranges",
    async (byteOrder) => {
      const indexOffset = 4096n;
      const rootOffset = indexOffset + 48n;
      const matchingLeafOffset = 9000n;
      const unrelatedLeafOffset = 8000n;
      const boundaryLeafOffset = 10_000n;
      const firstBlockOffset = 9_007_199_254_740_993n;
      const secondBlockOffset = firstBlockOffset + 100n;
      const firstBytes = Uint8Array.from([11, 12, 13]);
      const secondBytes = Uint8Array.from([21, 22]);
      const root = makeCirTreeNode(byteOrder, false, [
        {
          startChromosomeId: 1,
          startBase: 100,
          endChromosomeId: 2,
          endBase: 100,
          offset: unrelatedLeafOffset,
        },
        {
          startChromosomeId: 1,
          startBase: 900,
          endChromosomeId: 3,
          endBase: 100,
          offset: matchingLeafOffset,
        },
        {
          startChromosomeId: 2,
          startBase: 200,
          endChromosomeId: 2,
          endBase: 400,
          offset: boundaryLeafOffset,
        },
      ]);
      const matchingLeaf = makeCirTreeNode(byteOrder, true, [
        {
          startChromosomeId: 1,
          startBase: 900,
          endChromosomeId: 3,
          endBase: 100,
          offset: firstBlockOffset,
          size: BigInt(firstBytes.byteLength),
        },
        {
          startChromosomeId: 2,
          startBase: 150,
          endChromosomeId: 2,
          endBase: 175,
          offset: secondBlockOffset,
          size: BigInt(secondBytes.byteLength),
        },
        {
          startChromosomeId: 2,
          startBase: 200,
          endChromosomeId: 2,
          endBase: 250,
          offset: secondBlockOffset + 100n,
          size: 1n,
        },
      ]);
      const chunks = new Map<bigint, Uint8Array>([
        [indexOffset, makeCirTreeHeader(byteOrder, 3, 3n)],
        [rootOffset, root],
        [matchingLeafOffset, matchingLeaf],
        [firstBlockOffset, firstBytes],
        [secondBlockOffset, secondBytes],
      ]);
      const fetchMock = installRangeSource(chunks, { exposeContentRange: false });
      const header = parseBbiHeader(makeBigBedHeader(byteOrder, { uncompressBufferSize: 0 }));
      header.unzoomedIndexOffset = indexOffset;
      const query = { chromosomeId: 2, start: 100, end: 200 };

      await expect(readUncachedBbiDataBlocks(url, header, query)).resolves.toEqual([
        {
          bytes: firstBytes,
          offset: firstBlockOffset,
          size: 3n,
          query,
        },
        {
          bytes: secondBytes,
          offset: secondBlockOffset,
          size: 2n,
          query,
        },
      ]);
      expect(requestedRanges(fetchMock)).toEqual([
        "bytes=4096-4143",
        "bytes=4144-4243",
        "bytes=9000-9099",
        `bytes=${firstBlockOffset}-${firstBlockOffset + 2n}`,
        `bytes=${secondBlockOffset}-${secondBlockOffset + 1n}`,
      ]);
      expect(requestedRanges(fetchMock)).not.toContain("bytes=8000-8003");
      expect(requestedRanges(fetchMock)).not.toContain("bytes=10000-10003");
    },
  );

  it("returns no blocks without fetching non-overlapping branches or data", async () => {
    const byteOrder = "little-endian";
    const indexOffset = 4096n;
    const rootOffset = indexOffset + 48n;
    const root = makeCirTreeNode(byteOrder, false, [
      {
        startChromosomeId: 4,
        startBase: 0,
        endChromosomeId: 4,
        endBase: 100,
        offset: 8000n,
      },
    ]);
    const fetchMock = installRangeSource(
      new Map([
        [indexOffset, makeCirTreeHeader(byteOrder, 2, 1n)],
        [rootOffset, root],
      ]),
    );
    const header = parseBbiHeader(makeBigBedHeader(byteOrder));
    header.unzoomedIndexOffset = indexOffset;

    await expect(
      readUncachedBbiDataBlocks(url, header, { chromosomeId: 2, start: 0, end: 100 }),
    ).resolves.toEqual([]);
    expect(requestedRanges(fetchMock)).toEqual(["bytes=4096-4143", "bytes=4144-4211"]);
  });

  it("coalesces contiguous data blocks, preserves reference order, and slices compressed ranges", async () => {
    const plainBlocks = [Uint8Array.of(1, 2, 3), Uint8Array.of(4, 5), Uint8Array.of(6, 7, 8, 9)];
    const compressedBlocks = plainBlocks.map((bytes) => zlibSync(bytes));
    const fixture = makeDataBlockFixture(
      [compressedBlocks[1]!, compressedBlocks[0]!, compressedBlocks[2]!],
      [
        2_000n + BigInt(compressedBlocks[0]!.byteLength),
        2_000n,
        2_000n + BigInt(compressedBlocks[1]!.byteLength + compressedBlocks[0]!.byteLength),
      ],
      "little-endian",
      8,
    );
    const fetchMock = installContiguousRangeSource(fixture.resource);

    const blocks = await readUncachedBbiDataBlocks(url, fixture.header, fixture.query);

    expect(blocks).toEqual([
      {
        bytes: plainBlocks[1],
        offset: fixture.blockOffsets[0],
        size: BigInt(compressedBlocks[1]!.byteLength),
        query: fixture.query,
      },
      {
        bytes: plainBlocks[0],
        offset: fixture.blockOffsets[1],
        size: BigInt(compressedBlocks[0]!.byteLength),
        query: fixture.query,
      },
      {
        bytes: plainBlocks[2],
        offset: fixture.blockOffsets[2],
        size: BigInt(compressedBlocks[2]!.byteLength),
        query: fixture.query,
      },
    ]);
    expect(requestedRanges(fetchMock).at(-1)).toBe(
      `bytes=2000-${2000 + compressedBlocks.reduce((sum, bytes) => sum + bytes.byteLength, 0) - 1}`,
    );
  });

  it("does not merge noncontiguous data blocks", async () => {
    const blockBytes = [Uint8Array.of(1, 2), Uint8Array.of(3, 4), Uint8Array.of(5)];
    const fixture = makeDataBlockFixture(blockBytes, [1_000n, 1_003n, 1_006n]);
    const fetchMock = installContiguousRangeSource(fixture.resource);

    await readUncachedBbiDataBlocks(url, fixture.header, fixture.query);

    expect(requestedRanges(fetchMock).slice(-3)).toEqual([
      "bytes=1000-1001",
      "bytes=1003-1004",
      "bytes=1006-1006",
    ]);
  });

  it("caps each merged request at 256 KiB", async () => {
    const blockBytes = [
      new Uint8Array(100_000).fill(1),
      new Uint8Array(100_000).fill(2),
      new Uint8Array(100_000).fill(3),
    ];
    const fixture = makeDataBlockFixture(blockBytes, [1_000n, 101_000n, 201_000n]);
    const fetchMock = installContiguousRangeSource(fixture.resource);

    const blocks = await readUncachedBbiDataBlocks(url, fixture.header, fixture.query);

    expect(blocks.map(({ bytes }) => bytes[0])).toEqual([1, 2, 3]);
    expect(requestedRanges(fetchMock).slice(-2)).toEqual([
      "bytes=1000-200999",
      "bytes=201000-300999",
    ]);
  });

  it("limits merged-range fetch concurrency to four", async () => {
    const blockBytes = Array.from({ length: 5 }, (_, index) => Uint8Array.of(index + 1));
    const blockOffsets = [1_000n, 1_002n, 1_004n, 1_006n, 1_008n];
    const fixture = makeDataBlockFixture(blockBytes, blockOffsets);
    const fetchMock = installContiguousRangeSource(fixture.resource);
    const dataOffsetSet = new Set(blockOffsets.map(Number));
    const originalImplementation = fetchMock.getMockImplementation()!;
    const pending: Array<() => void> = [];
    let activeDataFetches = 0;
    let maximumActiveDataFetches = 0;
    let startedDataFetches = 0;
    let completedDataFetches = 0;
    let resolveFourStarted: (() => void) | undefined;
    let resolveFiveStarted: (() => void) | undefined;
    const fourStarted = new Promise<void>((resolve) => {
      resolveFourStarted = resolve;
    });
    const fiveStarted = new Promise<void>((resolve) => {
      resolveFiveStarted = resolve;
    });

    fetchMock.mockImplementation((input, init) => {
      const range = new Headers(init?.headers).get("Range") ?? "";
      const match = /^bytes=(\d+)-(\d+)$/.exec(range);
      const start = match === null ? -1 : Number(match[1]);
      if (!dataOffsetSet.has(start)) return originalImplementation(input, init);

      activeDataFetches += 1;
      maximumActiveDataFetches = Math.max(maximumActiveDataFetches, activeDataFetches);
      startedDataFetches += 1;
      if (startedDataFetches === 4) resolveFourStarted?.();
      if (startedDataFetches === 5) resolveFiveStarted?.();
      return new Promise<Response>((resolve) => {
        pending.push(() => {
          activeDataFetches -= 1;
          completedDataFetches += 1;
          resolve(
            new Response(fixture.resource.slice(Number(match![1]), Number(match![2]) + 1), {
              status: 206,
              headers: { "Content-Range": `bytes ${match![1]}-${match![2]}/*` },
            }),
          );
        });
      });
    });

    const read = readUncachedBbiDataBlocks(url, fixture.header, fixture.query);
    await fourStarted;
    expect(maximumActiveDataFetches).toBe(4);
    pending.shift()?.();
    await fiveStarted;
    pending.splice(0).forEach((release) => release());
    await read;

    expect(startedDataFetches).toBe(5);
    expect(completedDataFetches).toBe(5);
    expect(activeDataFetches).toBe(0);
  });

  it("inflates within the declared bound, repeats uncached reads, and rejects decode failures", async () => {
    const byteOrder = "little-endian";
    const indexOffset = 4096n;
    const rootOffset = indexOffset + 48n;
    const blockOffset = 12_000n;
    const plain = Uint8Array.from([1, 2, 3, 4, 5]);
    const compressed = zlibSync(plain);
    const leaf = makeCirTreeNode(byteOrder, true, [
      {
        startChromosomeId: 2,
        startBase: 10,
        endChromosomeId: 2,
        endBase: 20,
        offset: blockOffset,
        size: BigInt(compressed.byteLength),
      },
    ]);
    const commonChunks = [
      [indexOffset, makeCirTreeHeader(byteOrder, 1, 1n)],
      [rootOffset, leaf],
    ] as const;
    const header = parseBbiHeader(
      makeBigBedHeader(byteOrder, { uncompressBufferSize: plain.byteLength }),
    );
    header.unzoomedIndexOffset = indexOffset;
    const query = { chromosomeId: 2, start: 10, end: 20 };

    const fetchMock = installRangeSource(new Map([...commonChunks, [blockOffset, compressed]]));
    let firstReadBytes: Uint8Array | undefined;
    for (let read = 0; read < 2; read += 1) {
      const blocks = await readUncachedBbiDataBlocks(url, header, query);
      expect(blocks).toMatchObject([
        { bytes: plain, offset: blockOffset, size: BigInt(compressed.byteLength) },
      ]);
      firstReadBytes ??= blocks[0]?.bytes;
    }
    expect(firstReadBytes?.buffer.byteLength).toBe(firstReadBytes?.byteLength);
    const oneRead = [
      "bytes=4096-4143",
      "bytes=4144-4179",
      `bytes=${blockOffset}-${blockOffset + BigInt(compressed.byteLength) - 1n}`,
    ];
    expect(requestedRanges(fetchMock)).toEqual([...oneRead, ...oneRead]);

    installRangeSource(new Map([...commonChunks, [blockOffset, compressed]]));
    const undersizedHeader = { ...header, uncompressBufferSize: plain.byteLength - 1 };
    await expect(readUncachedBbiDataBlocks(url, undersizedHeader, query)).rejects.toThrow(
      "exceeds the declared buffer size",
    );

    const corrupt = new Uint8Array(compressed.byteLength);
    installRangeSource(new Map([...commonChunks, [blockOffset, corrupt]]));
    await expect(readUncachedBbiDataBlocks(url, header, query)).rejects.toBeInstanceOf(Error);

    const controller = new AbortController();
    const reason = new DOMException("cancelled after decompression", "AbortError");
    decompressionControl.afterDecompression = () => controller.abort(reason);
    installRangeSource(new Map([...commonChunks, [blockOffset, compressed]]));
    await expect(readUncachedBbiDataBlocks(url, header, query, controller.signal)).rejects.toBe(
      reason,
    );
  });

  it("preserves cancellation before a matching block fetch", async () => {
    const byteOrder = "little-endian";
    const indexOffset = 4096n;
    const rootOffset = indexOffset + 48n;
    const blockOffset = 12_000n;
    const leaf = makeCirTreeNode(byteOrder, true, [
      {
        startChromosomeId: 2,
        startBase: 10,
        endChromosomeId: 2,
        endBase: 20,
        offset: blockOffset,
        size: 1n,
      },
    ]);
    const chunks = new Map<bigint, Uint8Array>([
      [indexOffset, makeCirTreeHeader(byteOrder, 1, 1n)],
      [rootOffset, leaf],
      [blockOffset, Uint8Array.of(1)],
    ]);
    const controller = new AbortController();
    const reason = new DOMException("cancelled", "AbortError");
    const fetchMock = installRangeSource(chunks);
    const originalImplementation = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((input, init) => {
      const range = new Headers(init?.headers).get("Range");
      if (range === `bytes=${blockOffset}-${blockOffset}`) controller.abort(reason);
      return originalImplementation(input, init);
    });
    const header = parseBbiHeader(makeBigBedHeader(byteOrder, { uncompressBufferSize: 0 }));
    header.unzoomedIndexOffset = indexOffset;

    await expect(
      readUncachedBbiDataBlocks(
        url,
        header,
        { chromosomeId: 2, start: 10, end: 20 },
        controller.signal,
      ),
    ).rejects.toBe(reason);
  });
});
