import { describe, expect, it } from "vitest";
import { expandRegion, getPanCommitRegion } from "./usePanController";

describe("pan region math", () => {
  it("expands a region evenly around the visible span", () => {
    expect(expandRegion({ chromosome: "chr1", start: 100, end: 200 }, 3)).toEqual({
      chromosome: "chr1",
      start: 0,
      end: 300,
    });
  });

  it("commits a positive pan delta by shifting the region left", () => {
    expect(getPanCommitRegion({ chromosome: "chr1", start: 100, end: 200 }, 100, 25)).toEqual({
      chromosome: "chr1",
      start: 75,
      end: 175,
    });
  });

  it("commits a negative pan delta by shifting the region right", () => {
    expect(getPanCommitRegion({ chromosome: "chr1", start: 100, end: 200 }, 100, -25)).toEqual({
      chromosome: "chr1",
      start: 125,
      end: 225,
    });
  });
});
