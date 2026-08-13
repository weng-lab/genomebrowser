import { afterEach, describe, expect, it, vi } from "vitest";
import {
  lookupChromosome,
  parseBigBedHeader,
  readBigBedHeader,
  type BbiHeader,
} from "../src/internal/bbi";
import type { ByteOrder } from "../src/internal/binaryReader";

const url = "https://example.test/synthetic.bb";
const bigBedMagic = 0x8789f2eb;
const bPlusTreeMagic = 0x78ca8c91;
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
  vi.unstubAllGlobals();
});

describe("BBI common header", () => {
  it.each<ByteOrder>(["little-endian", "big-endian"])(
    "parses the complete BigBed header in %s order without narrowing unsigned values",
    (byteOrder) => {
      expect(parseBigBedHeader(makeBigBedHeader(byteOrder))).toEqual({
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

  it("rejects invalid magic and truncated required header fields", () => {
    expect(() => parseBigBedHeader(new Uint8Array(64))).toThrow("Invalid BigBed magic");
    expect(() => parseBigBedHeader(makeBigBedHeader("little-endian").subarray(0, 63))).toThrow(
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

      const header = await readBigBedHeader(url);
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
      const header: BbiHeader = await readBigBedHeader(url);
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
