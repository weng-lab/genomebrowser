import type { GenomicRegion } from "@weng-lab/genomebrowser";
import type { BamRecord } from "@weng-lab/genomic-reader";

/** A half-open span of constant, nonzero depth. */
export type BamCoverageRun = { start: number; end: number; depth: number };

/** Depth summarized over the bases one plotted bin covers. */
export type BamCoverageBin = {
  kind: "coverage";
  chromosome: string;
  start: number;
  end: number;
  mean: number;
  max: number;
};

/**
 * Per-base depth over the region as sorted, nonoverlapping runs.
 *
 * Only `M`, `=`, and `X` blocks add depth, so deletions and skipped introns read
 * as uncovered. Each block costs two difference updates rather than one per
 * base, so cost follows the number of CIGAR operations, not aligned bases.
 */
export function computeCoverageRuns(
  records: readonly BamRecord[],
  region: GenomicRegion,
): BamCoverageRun[] {
  const deltas = new Map<number, number>();
  const bump = (position: number, amount: number) =>
    deltas.set(position, (deltas.get(position) ?? 0) + amount);
  for (const record of records) {
    if (record.chromosome !== region.chromosome) continue;
    for (const operation of record.cigar) {
      if (operation.op !== "M" && operation.op !== "=" && operation.op !== "X") continue;
      const position = record.start + operation.referenceOffset;
      const start = Math.max(position, region.start);
      const end = Math.min(position + operation.length, region.end);
      if (end <= start) continue;
      bump(start, 1);
      bump(end, -1);
    }
  }

  const boundaries = [...deltas.keys()].sort((left, right) => left - right);
  const runs: BamCoverageRun[] = [];
  let depth = 0;
  for (let index = 0; index < boundaries.length - 1; index++) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    depth += deltas.get(start)!;
    if (depth === 0) continue;
    const previous = runs.at(-1);
    if (previous?.end === start && previous.depth === depth) previous.end = end;
    else runs.push({ start, end, depth });
  }
  return runs;
}

/**
 * Summarizes runs into at most one bin per pixel and at most one bin per base.
 * Bin edges fall on whole bases, so every bin reports exact per-base values;
 * binning changes only which summary is plotted.
 */
export function binCoverage(
  runs: readonly BamCoverageRun[],
  region: GenomicRegion,
  width: number,
): BamCoverageBin[] {
  const span = region.end - region.start;
  const count = Math.min(span, Math.max(1, Math.floor(width)));
  const bins: BamCoverageBin[] = [];
  let first = 0;
  for (let index = 0; index < count; index++) {
    const start = region.start + Math.floor((index * span) / count);
    const end = region.start + Math.floor(((index + 1) * span) / count);
    while (first < runs.length && runs[first].end <= start) first++;
    let sum = 0;
    let max = 0;
    for (let next = first; next < runs.length && runs[next].start < end; next++) {
      const run = runs[next];
      sum += (Math.min(end, run.end) - Math.max(start, run.start)) * run.depth;
      max = Math.max(max, run.depth);
    }
    bins.push({
      kind: "coverage",
      chromosome: region.chromosome,
      start,
      end,
      mean: sum / (end - start),
      max,
    });
  }
  return bins;
}

/** The bin containing a genomic position, if any. */
export function findCoverageBin(bins: readonly BamCoverageBin[], position: number) {
  let low = 0;
  let high = bins.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const bin = bins[middle];
    if (position < bin.start) high = middle - 1;
    else if (position >= bin.end) low = middle + 1;
    else return bin;
  }
  return undefined;
}
