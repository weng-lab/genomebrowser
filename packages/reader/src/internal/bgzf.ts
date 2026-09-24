import { gunzipSync } from "fflate";

/**
 * BGZF is the block-compressed gzip variant that BAM files use. Every block is
 * an ordinary gzip member carrying an extra subfield ("BC") that records the
 * block's own compressed length, which makes the file seekable: an index can
 * point at a block boundary without the reader having to scan from the start.
 *
 * Positions inside a BGZF file are "virtual offsets" - the compressed offset of
 * the block in the top 48 bits and the offset inside that block's uncompressed
 * data in the bottom 16. That is why a block's uncompressed size can never
 * exceed 64 KiB.
 */

/** Uncompressed data in one block is addressed by 16 bits. */
export const BGZF_MAX_UNCOMPRESSED_BLOCK_SIZE = 65536;

const GZIP_ID1 = 31;
const GZIP_ID2 = 139;
const DEFLATE_COMPRESSION_METHOD = 8;
const FEXTRA_FLAG = 0x04;
const BGZF_SUBFIELD_ID1 = 66; // 'B'
const BGZF_SUBFIELD_ID2 = 67; // 'C'
const HEADER_BYTES_BEFORE_EXTRA = 12;

export type VirtualOffset = {
  /** Compressed offset of the block within the file. */
  blockOffset: bigint;
  /** Offset within that block's uncompressed data. */
  dataOffset: number;
};

export function splitVirtualOffset(offset: bigint): VirtualOffset {
  return { blockOffset: offset >> 16n, dataOffset: Number(offset & 0xffffn) };
}

/**
 * One inflated block, tagged with where its compressed form started so callers
 * can line virtual offsets up with the concatenated data.
 */
export type BgzfBlock = {
  blockOffset: bigint;
  compressedSize: number;
  data: Uint8Array;
};

/**
 * Total compressed length of the block starting at `at`, taken from the BC
 * subfield. Returns undefined when the buffer does not hold the complete gzip
 * header, so a caller reading bounded ranges can fetch more and retry.
 */
function readBlockSize(bytes: Uint8Array, at: number): number | undefined {
  if (at + HEADER_BYTES_BEFORE_EXTRA > bytes.length) return undefined;
  if (bytes[at] !== GZIP_ID1 || bytes[at + 1] !== GZIP_ID2) {
    throw new Error("Expected a BGZF block: the gzip magic number is missing");
  }
  if (bytes[at + 2] !== DEFLATE_COMPRESSION_METHOD) {
    throw new Error("Unsupported BGZF block: only deflate is defined for gzip");
  }
  if ((bytes[at + 3]! & FEXTRA_FLAG) === 0) {
    throw new Error("Expected a BGZF block: the gzip FEXTRA flag is not set");
  }

  const extraLength = bytes[at + 10]! | (bytes[at + 11]! << 8);
  const extraStart = at + HEADER_BYTES_BEFORE_EXTRA;
  if (extraStart + extraLength > bytes.length) return undefined;

  let cursor = extraStart;
  while (cursor + 4 <= extraStart + extraLength) {
    const subfieldId1 = bytes[cursor]!;
    const subfieldId2 = bytes[cursor + 1]!;
    const subfieldLength = bytes[cursor + 2]! | (bytes[cursor + 3]! << 8);
    if (subfieldId1 === BGZF_SUBFIELD_ID1 && subfieldId2 === BGZF_SUBFIELD_ID2) {
      if (subfieldLength !== 2) {
        throw new Error("Invalid BGZF block: the BC subfield must hold two bytes");
      }
      if (cursor + 6 > bytes.length) return undefined;
      // BSIZE is the total block length minus one.
      return (bytes[cursor + 4]! | (bytes[cursor + 5]! << 8)) + 1;
    }
    cursor += 4 + subfieldLength;
  }

  throw new Error("Expected a BGZF block: the BC subfield is missing");
}

/**
 * Inflates consecutive BGZF blocks from a buffer that begins exactly on a block
 * boundary. Stops cleanly at the first truncated block, so a caller can fetch a
 * bounded range without knowing where the last complete block ends.
 */
export function inflateBgzfBlocks(bytes: Uint8Array, startOffset: bigint): BgzfBlock[] {
  const blocks: BgzfBlock[] = [];
  let cursor = 0;

  while (cursor < bytes.length) {
    const compressedSize = readBlockSize(bytes, cursor);
    if (compressedSize === undefined) break;
    if (compressedSize <= 0) throw new Error("Invalid BGZF block: the block size must be positive");
    if (cursor + compressedSize > bytes.length) break;

    // gunzipSync handles the gzip framing, including the extra subfields.
    const data = gunzipSync(bytes.subarray(cursor, cursor + compressedSize));
    if (data.length > BGZF_MAX_UNCOMPRESSED_BLOCK_SIZE) {
      throw new Error("Invalid BGZF block: uncompressed data exceeds 64 KiB");
    }
    blocks.push({ blockOffset: startOffset + BigInt(cursor), compressedSize, data });
    cursor += compressedSize;
  }

  return blocks;
}

/**
 * Joins inflated blocks into one buffer and records where each block landed, so
 * a virtual offset becomes an index into the result. Records routinely straddle
 * block boundaries, which is why decoding works on the joined buffer rather
 * than block by block.
 */
export function joinBgzfBlocks(blocks: readonly BgzfBlock[]): {
  data: Uint8Array;
  startIndexByBlockOffset: Map<bigint, number>;
} {
  let total = 0;
  for (const block of blocks) total += block.data.length;

  const data = new Uint8Array(total);
  const startIndexByBlockOffset = new Map<bigint, number>();
  let cursor = 0;
  for (const block of blocks) {
    startIndexByBlockOffset.set(block.blockOffset, cursor);
    data.set(block.data, cursor);
    cursor += block.data.length;
  }

  return { data, startIndexByBlockOffset };
}
