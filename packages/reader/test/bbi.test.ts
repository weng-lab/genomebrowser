import { zlibSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupChromosome } from "../src/internal/bbi/chromosomeTree";
import { parseBbiHeader, readBbiHeader, type BbiHeader } from "../src/internal/bbi/commonHeader";
import { readBbiDataBlocks } from "../src/internal/bbi/dataBlocks";
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

function littleEndian(byteOrder: ByteOrder): boolean {
  return byteOrder === "little-endian";
}

function makeBigBedHeader(
  byteOrder: ByteOrder,
  overrides: Partial<{
    chromosomeTreeOffset: bigint;
    uncompressBufferSize: number;
  }> = {},
): Uint8Array {
  const bytes = new Uint8Array(64);
  const view = new DataView(bytes.buffer);
  const little = littleEndian(byteOrder);
  view.setUint32(0, bigBedMagic, little);
  view.setUint16(4, 4, little);
  view.setUint16(6, 0xffff, little);
  view.setBigUint64(8, overrides.chromosomeTreeOffset ?? 0x20_0000_0000_0001n, little);
  view.setBigUint64(16, 0x30_0000_0000_0002n, little);
  view.setBigUint64(24, 0x40_0000_0000_0003n, little);
  view.setUint16(32, 0xffff, little);
  view.setUint16(34, 0xfffe, little);
  view.setBigUint64(36, 0x50_0000_0000_0004n, little);
  view.setBigUint64(44, 0x60_0000_0000_0005n, little);
  view.setUint32(52, overrides.uncompressBufferSize ?? 0xffffffff, little);
  view.setBigUint64(56, 0x70_0000_0000_0006n, little);
  return bytes;
}

function makeTreeHeader(byteOrder: ByteOrder, keySize: number, itemCount: bigint): Uint8Array {
  const bytes = new Uint8Array(32);
  const view = new DataView(bytes.buffer);
  const little = littleEndian(byteOrder);
  view.setUint32(0, bPlusTreeMagic, little);
  view.setUint32(4, 3, little);
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
): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
    const range = new Headers(init?.headers).get("Range");
    const match = /^bytes=(\d+)-(\d+)$/.exec(range ?? "");
    if (match === null) throw new Error(`Unexpected range header: ${range}`);
    const start = BigInt(match[1]);
    const end = BigInt(match[2]);
    const chunk = chunks.get(start);
    if (chunk === undefined || BigInt(chunk.byteLength) !== end - start + 1n) {
      throw new Error(`Unexpected byte request: ${range}`);
    }
    return Promise.resolve(
      new Response(chunk.slice(), {
        status: 206,
        headers: { "Content-Range": `bytes ${start}-${end}/*` },
      }),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestedRanges(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>): string[] {
  return fetchMock.mock.calls.map(([, init]) => new Headers(init?.headers).get("Range") ?? "");
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
        [rootOffset, root.subarray(0, 4)],
        [rootOffset + 4n, root.subarray(4)],
        [middleOffset, middle.subarray(0, 4)],
        [middleOffset + 4n, middle.subarray(4)],
        [leafOffset, leaf.subarray(0, 4)],
        [leafOffset + 4n, leaf.subarray(4)],
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
        "bytes=4128-4131",
        "bytes=4132-4179",
        "bytes=12000-12003",
        "bytes=12004-12035",
        "bytes=20000-20003",
        "bytes=20004-20035",
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
      [rootOffset, root.subarray(0, 4)],
      [rootOffset + 4n, root.subarray(4)],
      [leafOffset, leaf.subarray(0, 4)],
      [leafOffset + 4n, leaf.subarray(4)],
    ]);
    const fetchMock = installRangeSource(chunks);

    for (let read = 0; read < 2; read += 1) {
      const header: BbiHeader = await readBbiHeader(url);
      await expect(lookupChromosome(url, header, "chrN")).resolves.toBeUndefined();
    }

    const oneRead = [
      "bytes=0-63",
      "bytes=4096-4127",
      "bytes=4128-4131",
      "bytes=4132-4179",
      "bytes=21000-21003",
      "bytes=21004-21019",
    ];
    expect(requestedRanges(fetchMock)).toEqual([...oneRead, ...oneRead]);
    expect(requestedRanges(fetchMock)).not.toContain("bytes=9000-9003");
    expect(requestedRanges(fetchMock)).not.toContain("bytes=15000-15003");
  });
});

describe("lazy primary R-tree traversal and BBI block retrieval", () => {
  it.each<ByteOrder>(["little-endian", "big-endian"])(
    "uses unsigned %s index values, pairwise half-open overlap, and sequential absolute reads",
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
        [rootOffset, root.subarray(0, 4)],
        [rootOffset + 4n, root.subarray(4)],
        [matchingLeafOffset, matchingLeaf.subarray(0, 4)],
        [matchingLeafOffset + 4n, matchingLeaf.subarray(4)],
        [firstBlockOffset, firstBytes],
        [secondBlockOffset, secondBytes],
      ]);
      const fetchMock = installRangeSource(chunks);
      const header = parseBbiHeader(makeBigBedHeader(byteOrder, { uncompressBufferSize: 0 }));
      header.unzoomedIndexOffset = indexOffset;
      const query = { chromosomeId: 2, start: 100, end: 200 };

      await expect(readBbiDataBlocks(url, header, query)).resolves.toEqual([
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
        "bytes=4144-4147",
        "bytes=4148-4219",
        "bytes=9000-9003",
        "bytes=9004-9099",
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
        [rootOffset, root.subarray(0, 4)],
        [rootOffset + 4n, root.subarray(4)],
      ]),
    );
    const header = parseBbiHeader(makeBigBedHeader(byteOrder));
    header.unzoomedIndexOffset = indexOffset;

    await expect(
      readBbiDataBlocks(url, header, { chromosomeId: 2, start: 0, end: 100 }),
    ).resolves.toEqual([]);
    expect(requestedRanges(fetchMock)).toEqual([
      "bytes=4096-4143",
      "bytes=4144-4147",
      "bytes=4148-4171",
    ]);
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
      [rootOffset, leaf.subarray(0, 4)],
      [rootOffset + 4n, leaf.subarray(4)],
    ] as const;
    const header = parseBbiHeader(
      makeBigBedHeader(byteOrder, { uncompressBufferSize: plain.byteLength }),
    );
    header.unzoomedIndexOffset = indexOffset;
    const query = { chromosomeId: 2, start: 10, end: 20 };

    const fetchMock = installRangeSource(new Map([...commonChunks, [blockOffset, compressed]]));
    let firstReadBytes: Uint8Array | undefined;
    for (let read = 0; read < 2; read += 1) {
      const blocks = await readBbiDataBlocks(url, header, query);
      expect(blocks).toMatchObject([
        { bytes: plain, offset: blockOffset, size: BigInt(compressed.byteLength) },
      ]);
      firstReadBytes ??= blocks[0]?.bytes;
    }
    expect(firstReadBytes?.buffer.byteLength).toBe(firstReadBytes?.byteLength);
    const oneRead = [
      "bytes=4096-4143",
      "bytes=4144-4147",
      "bytes=4148-4179",
      `bytes=${blockOffset}-${blockOffset + BigInt(compressed.byteLength) - 1n}`,
    ];
    expect(requestedRanges(fetchMock)).toEqual([...oneRead, ...oneRead]);

    installRangeSource(new Map([...commonChunks, [blockOffset, compressed]]));
    const undersizedHeader = { ...header, uncompressBufferSize: plain.byteLength - 1 };
    await expect(readBbiDataBlocks(url, undersizedHeader, query)).rejects.toThrow(
      "exceeds the declared buffer size",
    );

    const corrupt = new Uint8Array(compressed.byteLength);
    installRangeSource(new Map([...commonChunks, [blockOffset, corrupt]]));
    await expect(readBbiDataBlocks(url, header, query)).rejects.toBeInstanceOf(Error);

    const controller = new AbortController();
    const reason = new DOMException("cancelled after decompression", "AbortError");
    decompressionControl.afterDecompression = () => controller.abort(reason);
    installRangeSource(new Map([...commonChunks, [blockOffset, compressed]]));
    await expect(readBbiDataBlocks(url, header, query, controller.signal)).rejects.toBe(reason);
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
      [rootOffset, leaf.subarray(0, 4)],
      [rootOffset + 4n, leaf.subarray(4)],
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
      readBbiDataBlocks(url, header, { chromosomeId: 2, start: 10, end: 20 }, controller.signal),
    ).rejects.toBe(reason);
  });
});
