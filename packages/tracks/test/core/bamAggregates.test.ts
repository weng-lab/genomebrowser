import { describe, expect, it } from "vitest";
import type { BamRecord } from "@weng-lab/genomebrowser-tracks/bam";
import { binCoverage, computeCoverageRuns } from "../../src/bam/coverage";
import { filterBamRecords } from "../../src/bam/filters";
import { computeJunctions, filterJunctions } from "../../src/bam/junctions";

type Operation = BamRecord["cigar"][number]["op"];
/** Builds a record from a CIGAR string such as "5M10N5M". */
function read(start: number, cigarText: string, overrides: Partial<BamRecord> = {}): BamRecord {
  const cigar: BamRecord["cigar"] = [];
  let referenceOffset = 0;
  let sequenceOffset = 0;
  for (const [, length, op] of cigarText.matchAll(/(\d+)([MIDNSHP=X])/g)) {
    cigar.push({ op: op as Operation, length: Number(length), referenceOffset, sequenceOffset });
    if ("MDN=X".includes(op)) referenceOffset += Number(length);
    if ("MIS=X".includes(op)) sequenceOffset += Number(length);
  }
  return {
    chromosome: "chr1",
    start,
    end: start + referenceOffset,
    readName: `read-${start}-${cigarText}`,
    flags: 0,
    strand: "+",
    mappingQuality: 60,
    sequence: "A".repeat(sequenceOffset),
    phredQualities: null,
    cigar,
    mate: null,
    templateLength: 0,
    ...overrides,
  };
}
const region = { chromosome: "chr1", start: 0, end: 100 };

describe("BAM coverage", () => {
  it("counts aligned blocks only, so introns, deletions, insertions, and clips add no depth", () => {
    const records = [read(10, "2S5M10N5M"), read(12, "3M2D3=1I2X"), read(40, "5M")];
    expect(computeCoverageRuns(records, region)).toEqual([
      { start: 10, end: 12, depth: 1 },
      { start: 12, end: 15, depth: 2 },
      { start: 17, end: 22, depth: 1 },
      { start: 25, end: 30, depth: 1 },
      { start: 40, end: 45, depth: 1 },
    ]);
  });
  it("clips depth to the region and ignores other chromosomes", () => {
    const records = [read(95, "10M"), read(0, "10M", { chromosome: "chr2" })];
    expect(computeCoverageRuns(records, region)).toEqual([{ start: 95, end: 100, depth: 1 }]);
  });
  it("keeps one bin per base when zoomed in and summarizes whole bases per pixel otherwise", () => {
    const runs = computeCoverageRuns([read(0, "4M"), read(2, "2M")], {
      ...region,
      end: 8,
    });
    const perBase = binCoverage(runs, { ...region, end: 8 }, 800);
    expect(perBase.map((bin) => [bin.start, bin.end, bin.max])).toEqual([
      [0, 1, 1],
      [1, 2, 1],
      [2, 3, 2],
      [3, 4, 2],
      [4, 5, 0],
      [5, 6, 0],
      [6, 7, 0],
      [7, 8, 0],
    ]);
    const summarized = binCoverage(runs, { ...region, end: 8 }, 2);
    expect(summarized).toMatchObject([
      { start: 0, end: 4, mean: 1.5, max: 2 },
      { start: 4, end: 8, mean: 0, max: 0 },
    ]);
  });
});

describe("BAM splice junctions", () => {
  it("counts supporting alignments per distinct junction and applies junction filters", () => {
    const records = [
      read(0, "5M10N5M"),
      read(2, "3M10N5M20N5M"),
      read(1, "4M11N5M"),
      read(0, "5M10N5M", { chromosome: "chr2" }),
    ];
    const junctions = computeJunctions(records);
    expect(
      junctions.map(({ chromosome, start, end, support }) => [chromosome, start, end, support]),
    ).toEqual([
      ["chr1", 5, 15, 2],
      ["chr1", 5, 16, 1],
      ["chr1", 20, 40, 1],
      ["chr2", 5, 15, 1],
    ]);
    expect(filterJunctions(junctions, { minimumSupport: 2 })).toHaveLength(1);
    expect(filterJunctions(junctions, { minimumSupport: 1, maximumSpan: 10 })).toHaveLength(2);
  });
  it("reports the same count wherever a loaded region touches the junction", () => {
    // Every alignment containing a junction overlaps any region the junction overlaps.
    const records = [read(0, "5M1000N5M"), read(3, "2M1000N8M"), read(990, "20M")];
    for (const start of [0, 500, 1000]) {
      const loaded = filterBamRecords(
        records,
        { includeDuplicates: true, minimumMappingQuality: 0 },
        { chromosome: "chr1", start, end: start + 10 },
      );
      expect(computeJunctions(loaded).map((junction) => junction.support)).toEqual([2]);
    }
  });
  it("applies the shared alignment filters before counting", () => {
    const records = [
      read(0, "5M10N5M"),
      read(0, "5M10N5M", { flags: 1024 }),
      read(0, "5M10N5M", { mappingQuality: 255 }),
    ];
    const filtered = filterBamRecords(
      records,
      { includeDuplicates: false, minimumMappingQuality: 20 },
      region,
    );
    expect(computeJunctions(filtered)[0].support).toBe(1);
    expect(computeCoverageRuns(filtered, region)[0].depth).toBe(1);
  });
});
