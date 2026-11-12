import type { GenomicRegion } from "@weng-lab/genomebrowser";
import type { BigBedSummaryRecord } from "@weng-lab/genomic-reader";

type CoverageSummary = Pick<
  BigBedSummaryRecord,
  "kind" | "chromosome" | "start" | "end" | "validCount" | "mean"
>;
type CoverageData =
  | { kind: "repeats"; repeats: readonly (GenomicRegion & { kind: "repeat" })[] }
  | { kind: "summary"; summaries: readonly BigBedSummaryRecord[] }
  | { kind: "detail-required" };

// Raw repeats are visited in start order to measure their union separately from total overlap.
// Stored zoom bins lack covered positions, so those still estimate uniform coverage per bin.
export function coverageCells(data: CoverageData, region: GenomicRegion, width: number) {
  const count = Math.max(1, Math.ceil(width));
  const bpPerBin = (region.end - region.start) / count;
  const bins = Array.from({ length: count }, () => ({
    covered: 0,
    total: 0,
    coveredEnd: Number.NEGATIVE_INFINITY,
  }));
  const records =
    data.kind === "summary"
      ? data.summaries
      : data.kind === "repeats"
        ? [...data.repeats].sort((a, b) => a.start - b.start)
        : [];
  for (const record of records) {
    const first = Math.max(0, Math.floor((record.start - region.start) / bpPerBin));
    const last = Math.min(count - 1, Math.ceil((record.end - region.start) / bpPerBin) - 1);
    for (let i = first; i <= last; i++) {
      const start = Math.max(record.start, region.start + i * bpPerBin);
      const end = Math.min(record.end, region.start + (i + 1) * bpPerBin);
      const overlap = Math.max(0, end - start);
      const bin = bins[i]!;
      if (record.kind === "summary") {
        const covered = (overlap * record.validCount) / (record.end - record.start);
        bin.covered += covered;
        bin.total += covered * record.mean;
      } else {
        bin.covered += Math.max(0, end - Math.max(start, bin.coveredEnd));
        bin.coveredEnd = Math.max(bin.coveredEnd, end);
        bin.total += overlap;
      }
    }
  }
  return bins.flatMap((bin, index) => {
    if (bin.covered <= 0) return [];
    const start = region.start + index * bpPerBin;
    const end = Math.min(region.end, start + bpPerBin);
    const item: CoverageSummary = {
      kind: "summary",
      chromosome: region.chromosome,
      start: Math.floor(start),
      end: Math.ceil(end),
      validCount: Math.min(bpPerBin, bin.covered),
      mean: bin.total / Math.min(bpPerBin, bin.covered),
    };
    const gray = Math.round(230 * (1 - Math.min(1, bin.covered / bpPerBin)));
    return [
      {
        key: `${region.chromosome}:${start}`,
        item,
        x: (index * width) / count,
        width: width / count,
        fill: `rgb(${gray},${gray},${gray})`,
      },
    ];
  });
}
