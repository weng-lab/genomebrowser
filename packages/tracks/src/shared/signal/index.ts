import type { BigWigSummaryRecord, BigWigValueRecord } from "@weng-lab/genomic-reader";
import type { GenomicRegion } from "@weng-lab/genomebrowser";

export type SignalPoint = { x: number; min: number | null; max: number | null };

export function condenseSignalRecords(
  records: readonly (BigWigValueRecord | BigWigSummaryRecord)[],
  region: GenomicRegion,
  width: number,
): SignalPoint[] {
  const pixelWidth = Math.max(1, Math.floor(width));
  const points: SignalPoint[] = Array.from({ length: pixelWidth }, (_, x) => ({
    x,
    min: null,
    max: null,
  }));
  const regionWidth = region.end - region.start;
  if (regionWidth <= 0) return points;

  for (const record of records) {
    if (
      record.chromosome !== region.chromosome ||
      record.start >= region.end ||
      record.end <= region.start
    ) {
      continue;
    }

    const start = Math.max(record.start, region.start);
    const end = Math.min(record.end, region.end);
    if (start >= end) continue;

    const firstPixel = Math.max(0, Math.floor(((start - region.start) * pixelWidth) / regionWidth));
    const lastPixel = Math.min(
      pixelWidth - 1,
      Math.ceil(((end - region.start) * pixelWidth) / regionWidth) - 1,
    );
    if (firstPixel > lastPixel) continue;

    const min = record.kind === "value" ? record.value : record.min;
    const max = record.kind === "value" ? record.value : record.max;
    for (let x = firstPixel; x <= lastPixel; x += 1) {
      const point = points[x];
      point.min = point.min === null ? min : Math.min(point.min, min);
      point.max = point.max === null ? max : Math.max(point.max, max);
    }
  }

  return points;
}
