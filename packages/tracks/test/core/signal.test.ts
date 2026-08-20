import { describe, expect, it } from "vitest";
import { condenseSignalRecords } from "@weng-lab/genomebrowser-tracks/shared/signal";

const region = { chromosome: "chr1", start: 0, end: 100 };

describe("condenseSignalRecords", () => {
  it("maps value records to both bounds and summary records to their bounds", () => {
    expect(
      condenseSignalRecords(
        [
          { kind: "value", chromosome: "chr1", start: 0, end: 25, value: 2 },
          summary(25, 50, -1, 5),
        ],
        region,
        4,
      ),
    ).toEqual([
      { x: 0, min: 2, max: 2 },
      { x: 1, min: -1, max: 5 },
      { x: 2, min: null, max: null },
      { x: 3, min: null, max: null },
    ]);
  });

  it("uses half-open pixel and record boundaries", () => {
    expect(
      condenseSignalRecords(
        [
          { kind: "value", chromosome: "chr1", start: 0, end: 25, value: 1 },
          { kind: "value", chromosome: "chr1", start: 25, end: 50, value: 2 },
          { kind: "value", chromosome: "chr1", start: 50, end: 75, value: 3 },
        ],
        region,
        4,
      ),
    ).toEqual([
      { x: 0, min: 1, max: 1 },
      { x: 1, min: 2, max: 2 },
      { x: 2, min: 3, max: 3 },
      { x: 3, min: null, max: null },
    ]);
  });

  it("aggregates overlapping records by lowest minimum and highest maximum", () => {
    expect(
      condenseSignalRecords(
        [
          { kind: "value", chromosome: "chr1", start: 0, end: 60, value: 2 },
          summary(20, 70, -1, 7),
        ],
        region,
        4,
      ),
    ).toEqual([
      { x: 0, min: -1, max: 7 },
      { x: 1, min: -1, max: 7 },
      { x: 2, min: -1, max: 7 },
      { x: 3, min: null, max: null },
    ]);
  });

  it("clips boundary-crossing records and skips other chromosomes and non-overlaps", () => {
    expect(
      condenseSignalRecords(
        [
          { kind: "value", chromosome: "chr1", start: 0, end: 15, value: 1 },
          { kind: "value", chromosome: "chr1", start: 25, end: 40, value: 2 },
          { kind: "value", chromosome: "chr2", start: 10, end: 30, value: 3 },
          { kind: "value", chromosome: "chr1", start: 30, end: 40, value: 4 },
        ],
        { chromosome: "chr1", start: 10, end: 30 },
        2,
      ),
    ).toEqual([
      { x: 0, min: 1, max: 1 },
      { x: 1, min: 2, max: 2 },
    ]);
  });

  it("keeps missing pixels empty and floors width with a minimum of one pixel", () => {
    expect(condenseSignalRecords([], region, 2.9)).toEqual([
      { x: 0, min: null, max: null },
      { x: 1, min: null, max: null },
    ]);
    expect(condenseSignalRecords([], region, 0)).toEqual([{ x: 0, min: null, max: null }]);
    expect(condenseSignalRecords([], region, -2)).toEqual([{ x: 0, min: null, max: null }]);
  });
});

function summary(start: number, end: number, min: number, max: number) {
  return {
    kind: "summary" as const,
    chromosome: "chr1",
    start,
    end,
    validCount: 1,
    min,
    max,
    sum: min,
    sumSquares: min * min,
    mean: min,
  };
}
