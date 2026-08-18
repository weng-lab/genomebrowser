import { unzlibSync } from "fflate";
import { throwIfAborted } from "../abort";
import type { ExactRangeOptions } from "../httpRange";
import { RequestRangeReader } from "../requestRangeReader";
import type { BbiHeader } from "./commonHeader";
import {
  findPrimaryDataBlocks,
  type BbiQuery,
  type BlockReference,
  type ParsedPrimaryRTreeNode,
  type PrimaryRTreeHeader,
} from "./regionalIndex";

export type BbiDataBlock = {
  bytes: Uint8Array;
  offset: bigint;
  size: bigint;
  query: BbiQuery;
};

const MAX_MERGED_RANGE_SIZE = 256n * 1024n;
const MAX_CONCURRENT_MERGED_RANGES = 4;
const MAX_UINT64 = 0xffff_ffff_ffff_ffffn;

type PlannedBlock = {
  reference: BlockReference;
  referenceIndex: number;
  offsetInRange: bigint;
};

type MergedRange = {
  offset: bigint;
  size: bigint;
  mergeable: boolean;
  blocks: PlannedBlock[];
};

function canMergeReference(reference: BlockReference): boolean {
  if (reference.offset < 0n || reference.offset > MAX_UINT64 || reference.size <= 0n) {
    return false;
  }
  return reference.offset + reference.size - 1n <= MAX_UINT64;
}

function planMergedRanges(references: readonly BlockReference[]): MergedRange[] {
  const sortedReferences = references
    .map((reference, referenceIndex) => ({ reference, referenceIndex }))
    .sort((left, right) => {
      if (left.reference.offset === right.reference.offset) {
        return left.referenceIndex - right.referenceIndex;
      }
      return left.reference.offset < right.reference.offset ? -1 : 1;
    });

  const ranges: MergedRange[] = [];
  for (const { reference, referenceIndex } of sortedReferences) {
    const lastRange = ranges.at(-1);
    const mergeable = canMergeReference(reference);
    const referenceEnd = reference.offset + reference.size;
    if (
      mergeable &&
      lastRange !== undefined &&
      lastRange.mergeable &&
      reference.offset === lastRange.offset + lastRange.size &&
      referenceEnd - lastRange.offset <= MAX_MERGED_RANGE_SIZE
    ) {
      lastRange.blocks.push({
        reference,
        referenceIndex,
        offsetInRange: reference.offset - lastRange.offset,
      });
      lastRange.size = referenceEnd - lastRange.offset;
    } else {
      ranges.push({
        offset: reference.offset,
        size: reference.size,
        mergeable,
        blocks: [
          {
            reference,
            referenceIndex,
            offsetInRange: 0n,
          },
        ],
      });
    }
  }

  return ranges;
}

function decompressBlock(
  bytes: Uint8Array,
  uncompressBufferSize: number,
): Uint8Array<ArrayBufferLike> {
  if (uncompressBufferSize === 0xffffffff) {
    throw new RangeError("Declared BBI decompression buffer size is not allocatable");
  }
  const output = unzlibSync(bytes, { out: new Uint8Array(uncompressBufferSize + 1) });
  if (output.byteLength > uncompressBufferSize) {
    throw new RangeError("Decompressed BBI block exceeds the declared buffer size");
  }
  return output.slice();
}

export async function readBbiDataBlocks(
  url: string,
  header: BbiHeader,
  tree: PrimaryRTreeHeader,
  query: BbiQuery,
  options?: ExactRangeOptions,
  requestReader?: RequestRangeReader,
  root?: ParsedPrimaryRTreeNode,
): Promise<BbiDataBlock[]> {
  const reader = requestReader ?? new RequestRangeReader(url, options);
  const references = await findPrimaryDataBlocks(url, header, tree, query, options, reader, root);
  const ranges = planMergedRanges(references);
  const blocks: Array<BbiDataBlock | undefined> = Array.from({ length: references.length });
  let nextRangeIndex = 0;
  let failed = false;
  let failure: unknown;

  async function readRange(): Promise<void> {
    for (;;) {
      if (failed) return;
      const rangeIndex = nextRangeIndex;
      nextRangeIndex += 1;
      const range = ranges[rangeIndex];
      if (range === undefined) return;

      try {
        throwIfAborted(options?.signal);
        const mergedBytes = await reader.readExact(range.offset, range.size);
        throwIfAborted(options?.signal);

        for (const plannedBlock of range.blocks) {
          throwIfAborted(options?.signal);
          const start = Number(plannedBlock.offsetInRange);
          const end = start + Number(plannedBlock.reference.size);
          const compressedBytes = mergedBytes.slice(start, end);
          let bytes: Uint8Array<ArrayBufferLike> = compressedBytes;
          if (header.uncompressBufferSize > 0) {
            throwIfAborted(options?.signal);
            bytes = decompressBlock(compressedBytes, header.uncompressBufferSize);
            throwIfAborted(options?.signal);
          }
          blocks[plannedBlock.referenceIndex] = {
            ...plannedBlock.reference,
            bytes,
            query,
          };
        }
      } catch (error) {
        if (!failed) {
          failed = true;
          failure = error;
        }
        return;
      }
    }
  }

  const workerCount = Math.min(MAX_CONCURRENT_MERGED_RANGES, ranges.length);
  await Promise.all(Array.from({ length: workerCount }, () => readRange()));
  if (failed) throw failure;
  throwIfAborted(options?.signal);
  return blocks.map((block) => {
    if (block === undefined) throw new Error("BBI data block was not loaded");
    return block;
  });
}
