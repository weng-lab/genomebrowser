import { throwIfAborted } from "./abort";
import { BinaryReader } from "./binaryReader";
import type { RequestRangeReader } from "./requestRangeReader";

/**
 * The BAI index that accompanies a BAM file. Each reference sequence gets a
 * binning index and a linear index:
 *
 * - The binning index maps a bin number to the chunks of the BAM holding
 *   records in that bin. Bins form a fixed six-level hierarchy, so a query
 *   region maps to a small set of candidate bins.
 * - The linear index records, for every 16 KiB window, the smallest virtual
 *   offset of any record overlapping that window. It prunes chunks that the
 *   binning index proposes but that cannot contain an overlapping record.
 */

const BAI_MAGIC = 0x01494142; // "BAI\1", little-endian
const LINEAR_INDEX_SHIFT = 14; // 16 KiB windows
/** Bin 37450 is a pseudo-bin carrying mapped/unmapped counts, not real chunks. */
const PSEUDO_BIN = 37450;

/**
 * Largest a BGZF block can be, and so the slack a reader must allow past a
 * chunk's final block: the index records where that block starts but not how
 * long it is.
 */
const MAX_COMPRESSED_BLOCK_SIZE = 1n << 16n;

export type BamChunk = {
  /** Virtual offset of the first record, inclusive. */
  begin: bigint;
  /** Virtual offset just past the last record, exclusive. */
  end: bigint;
};

export type BamIndexReference = {
  chunksByBin: Map<number, BamChunk[]>;
  linearIndex: bigint[];
};

export type BamIndex = {
  references: BamIndexReference[];
};

export async function readBamIndex(reader: RequestRangeReader): Promise<BamIndex> {
  // BAI files are small relative to their BAM, and every query needs the whole
  // structure, so read it once in full rather than range-reading pieces of it.
  const size = reader.resourceSize;
  const bytes =
    size === undefined
      ? await reader.readBounded(0n, 1n, 1n << 31n)
      : await reader.readExact(0n, size);
  throwIfAborted(reader.signal);
  return parseBamIndex(bytes);
}

export function parseBamIndex(bytes: Uint8Array): BamIndex {
  const binary = new BinaryReader(bytes, "little-endian");
  if (binary.readUint32() !== BAI_MAGIC) {
    throw new Error("Expected a BAI index file");
  }

  const referenceCount = binary.readUint32();
  const references: BamIndexReference[] = [];
  for (let referenceIndex = 0; referenceIndex < referenceCount; referenceIndex++) {
    const chunksByBin = new Map<number, BamChunk[]>();
    const binCount = binary.readUint32();
    for (let binIndex = 0; binIndex < binCount; binIndex++) {
      const bin = binary.readUint32();
      const chunkCount = binary.readUint32();
      const chunks: BamChunk[] = [];
      for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
        const begin = binary.readUint64();
        const end = binary.readUint64();
        chunks.push({ begin, end });
      }
      if (bin !== PSEUDO_BIN) chunksByBin.set(bin, chunks);
    }

    const intervalCount = binary.readUint32();
    const linearIndex: bigint[] = [];
    for (let intervalIndex = 0; intervalIndex < intervalCount; intervalIndex++) {
      linearIndex.push(binary.readUint64());
    }

    references.push({ chunksByBin, linearIndex });
  }

  return { references };
}

/**
 * Every bin that can contain a record overlapping [start, end). The six levels
 * halve in span each step: one 512 Mbp bin, then 64 Mbp, 8 Mbp, 1 Mbp, 128 kbp
 * and 16 kbp.
 */
export function regionToBins(start: number, end: number): number[] {
  const last = end - 1;
  const bins = [0];
  for (const [offset, shift] of [
    [1, 26],
    [9, 23],
    [73, 20],
    [585, 17],
    [4681, 14],
  ] as const) {
    for (let bin = offset + (start >> shift); bin <= offset + (last >> shift); bin++) {
      bins.push(bin);
    }
  }
  return bins;
}

/**
 * Chunks that may hold records overlapping [start, end), pruned by the linear
 * index, sorted, and merged where they are adjacent or overlapping so the
 * caller issues as few range requests as possible.
 */
export function selectChunks(reference: BamIndexReference, start: number, end: number): BamChunk[] {
  // Records overlapping the region cannot start before the linear index entry
  // for the window containing `start`, so any chunk ending at or before that
  // offset is noise from a coarse bin.
  const window = Math.min(start >> LINEAR_INDEX_SHIFT, reference.linearIndex.length - 1);
  const minimumOffset = window >= 0 ? (reference.linearIndex[window] ?? 0n) : 0n;

  const candidates: BamChunk[] = [];
  for (const bin of regionToBins(start, end)) {
    for (const chunk of reference.chunksByBin.get(bin) ?? []) {
      if (chunk.end > minimumOffset) candidates.push(chunk);
    }
  }
  if (candidates.length === 0) return [];

  candidates.sort((left, right) =>
    left.begin < right.begin ? -1 : left.begin > right.begin ? 1 : 0,
  );

  const merged: BamChunk[] = [];
  for (const chunk of candidates) {
    const previous = merged.at(-1);
    // Merge when the next chunk begins within the slack the previous one
    // already costs. A reader cannot know the length of a chunk's final block,
    // so it has to read a maximum block past it; anything starting inside that
    // window is bytes it fetches either way, and keeping the two apart buys a
    // second request for data already in hand. A dense locus is mostly chunks a
    // few hundred bytes long, so leaving them separate means each one pays the
    // full 64 KiB and the read is dominated by slack rather than by records.
    if (previous && (chunk.begin >> 16n) - (previous.end >> 16n) <= MAX_COMPRESSED_BLOCK_SIZE) {
      if (chunk.end > previous.end) previous.end = chunk.end;
      continue;
    }
    merged.push({ begin: chunk.begin, end: chunk.end });
  }

  return merged;
}
