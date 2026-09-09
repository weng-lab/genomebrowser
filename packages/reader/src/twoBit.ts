import type { GenomicFile, GenomicRecord } from "./genomicFile";
import { throwIfAborted } from "./internal/abort";
import { BinaryReader, type ByteOrder } from "./internal/binaryReader";
import type { ExactRangeMetadata } from "./internal/httpRange";
import { validateHttpUrl, validateRegion } from "./internal/inputValidation";
import { RequestRangeReader } from "./internal/requestRangeReader";

export type TwoBitFileOptions = { url: string };
export type TwoBitRecord = GenomicRecord & { sequence: string };
export type TwoBitFile = GenomicFile<TwoBitRecord>;
type Block = { start: number; end: number };
type SequenceMetadata = { size: number; packedOffset: bigint; unknown: Block[]; masked: Block[] };
type Index = { byteOrder: ByteOrder; offsets: Map<string, bigint> };
const SIGNATURE = 0x1a412743;

/** Read UCSC version-0 2bit files with zero-based, half-open coordinates. */
export function createTwoBitFile(options: TwoBitFileOptions): TwoBitFile {
  if (options === null || typeof options !== "object") {
    throw new TypeError("2bit file options must be an object");
  }
  const url = validateHttpUrl(options.url);
  const rangeMetadata: ExactRangeMetadata = {};
  let index: Index | undefined;
  const sequences = new Map<string, SequenceMetadata>();
  return {
    async read(region, options) {
      validateRegion(region);
      const signal = options?.signal;
      throwIfAborted(signal);
      const reader = new RequestRangeReader(url, { signal, metadata: rangeMetadata });
      const loadedIndex = index ?? (await readIndex(reader));
      throwIfAborted(signal);
      index = loadedIndex;
      const offset = loadedIndex.offsets.get(region.chromosome);
      if (offset === undefined) return [];
      const metadata =
        sequences.get(region.chromosome) ??
        (await readSequenceMetadata(reader, offset, loadedIndex.byteOrder));
      throwIfAborted(signal);
      sequences.set(region.chromosome, metadata);
      const end = Math.min(region.end, metadata.size);
      if (region.start >= end) return [];
      const firstByte = Math.floor(region.start / 4);
      const bytes = await reader.readExact(
        metadata.packedOffset + BigInt(firstByte),
        BigInt(Math.ceil(end / 4) - firstByte),
      );
      throwIfAborted(signal);
      const bases = new Array<string>(end - region.start);
      for (let position = region.start; position < end; position++) {
        bases[position - region.start] = "TCAG"[
          (bytes[Math.floor(position / 4) - firstByte]! >> (6 - 2 * (position % 4))) & 3
        ]!;
      }
      for (const block of metadata.unknown) {
        for (
          let position = Math.max(region.start, block.start);
          position < Math.min(end, block.end);
          position++
        ) {
          bases[position - region.start] = "N";
        }
      }
      for (const block of metadata.masked) {
        for (
          let position = Math.max(region.start, block.start);
          position < Math.min(end, block.end);
          position++
        ) {
          bases[position - region.start] = bases[position - region.start]!.toLowerCase();
        }
      }
      throwIfAborted(signal);
      return [
        { chromosome: region.chromosome, start: region.start, end, sequence: bases.join("") },
      ];
    },
  };
}

async function readIndex(reader: RequestRangeReader): Promise<Index> {
  const header = await reader.readExact(0n, 16n);
  const signature = new DataView(header.buffer, header.byteOffset, header.byteLength).getUint32(0);
  const byteOrder = signature === SIGNATURE ? "big-endian" : "little-endian";
  const binary = new BinaryReader(header, byteOrder);
  if (binary.readUint32() !== SIGNATURE) throw new Error("Expected a 2bit file");
  if (binary.readUint32() !== 0) throw new Error("Unsupported 2bit version (expected version 0)");
  const count = binary.readUint32();
  if (binary.readUint32() !== 0) throw new Error("Invalid 2bit reserved header field");
  const offsets = new Map<string, bigint>();
  let offset = 16n;
  let chunk: Uint8Array = new Uint8Array(0);
  let cursor = 0;
  for (let i = 0; i < count; i++) {
    throwIfAborted(reader.signal);
    if (cursor >= chunk.length || chunk.length - cursor < 1 + chunk[cursor]! + 4) {
      chunk = await reader.readBounded(offset, 5n, 65536n);
      cursor = 0;
    }
    const length = chunk[cursor]!;
    if (length === 0 || chunk.length - cursor < length + 5)
      throw new Error("Invalid 2bit sequence index");
    const name = new TextDecoder().decode(chunk.subarray(cursor + 1, cursor + 1 + length));
    const entry = new BinaryReader(
      chunk.subarray(cursor + 1 + length, cursor + length + 5),
      byteOrder,
    );
    const sequenceOffset = BigInt(entry.readUint32());
    if (offsets.has(name) || sequenceOffset < 16n) throw new Error("Invalid 2bit sequence index");
    offsets.set(name, sequenceOffset);
    cursor += length + 5;
    offset += BigInt(length + 5);
  }
  for (const sequenceOffset of offsets.values()) {
    if (sequenceOffset < offset) throw new Error("2bit sequence overlaps its index");
  }
  return { byteOrder, offsets };
}

async function readSequenceMetadata(
  reader: RequestRangeReader,
  offset: bigint,
  byteOrder: ByteOrder,
): Promise<SequenceMetadata> {
  const header = new BinaryReader(await reader.readExact(offset, 8n), byteOrder);
  const size = header.readUint32();
  const nCount = header.readUint32();
  offset += 8n;
  const unknown = await readBlocks(reader, offset, nCount, size, byteOrder);
  offset += BigInt(nCount) * 8n;
  const maskHeader = new BinaryReader(await reader.readExact(offset, 4n), byteOrder);
  const maskCount = maskHeader.readUint32();
  offset += 4n;
  const masked = await readBlocks(reader, offset, maskCount, size, byteOrder);
  offset += BigInt(maskCount) * 8n;
  const reserved = new BinaryReader(await reader.readExact(offset, 4n), byteOrder);
  if (reserved.readUint32() !== 0) throw new Error("Invalid 2bit sequence reserved field");
  const packedOffset = offset + 4n;
  if (
    reader.resourceSize !== undefined &&
    packedOffset + BigInt(Math.ceil(size / 4)) > reader.resourceSize
  ) {
    throw new Error("Truncated 2bit packed sequence");
  }
  return { size, packedOffset, unknown, masked };
}

async function readBlocks(
  reader: RequestRangeReader,
  offset: bigint,
  count: number,
  size: number,
  byteOrder: ByteOrder,
): Promise<Block[]> {
  if (count === 0) return [];
  if (count > size) throw new Error("Invalid 2bit block count");
  const binary = new BinaryReader(await reader.readExact(offset, BigInt(count) * 8n), byteOrder);
  const starts = Array.from({ length: count }, () => binary.readUint32());
  return starts.map((start, i) => {
    const end = start + binary.readUint32();
    if (start >= end || end > size || (i > 0 && start < starts[i - 1]!)) {
      throw new Error("Invalid 2bit block coordinates");
    }
    return { start, end };
  });
}
