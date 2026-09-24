import { describe, expect, it } from "vitest";
import { getContentPlacement, getRenderWindow } from "../../src/browser/viewport/renderWindow";
import type { AssemblyDefinition } from "../../src/genome/assembly";

const assembly: AssemblyDefinition = { id: "test", chromosomes: { chr1: 2_000 } };

describe("render window", () => {
  it("computes the overscanned target region and render width", () => {
    expect(getRenderWindow({ chromosome: "chr1", start: 100, end: 200 }, assembly, 250, 3)).toEqual(
      {
        targetRenderRegion: { chromosome: "chr1", start: 0, end: 300 },
        renderWidth: 750,
      },
    );
  });

  it.each([
    [
      "lower",
      { chromosome: "chr1", start: 0, end: 100 },
      { chromosome: "chr1", start: 0, end: 200 },
    ],
    [
      "upper",
      { chromosome: "chr1", start: 1_900, end: 2_000 },
      { chromosome: "chr1", start: 1_800, end: 2_000 },
    ],
  ] as const)(
    "bounds the %s overscan window without changing its visible scale",
    (_edge, region, target) => {
      expect(getRenderWindow(region, assembly, 250, 3)).toEqual({
        targetRenderRegion: target,
        renderWidth: 500,
      });
    },
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "does not create a render window from invalid track width %s",
    (trackWidth) => {
      expect(
        getRenderWindow({ chromosome: "chr1", start: 100, end: 200 }, assembly, trackWidth, 3),
      ).toBeNull();
    },
  );
});

describe("content placement", () => {
  // 1px = 1 base with a 1000px track and a 50px margin.
  const view = { chromosome: "chr1", start: 1_500, end: 2_500 };

  it("keeps old data where it was after a committed pan", () => {
    expect(
      getContentPlacement({ chromosome: "chr1", start: 0, end: 3_000 }, view, 1_000, 50),
    ).toEqual({ x: 50 - 1_500, width: 3_000 });
  });

  it("centers data fetched around the view", () => {
    expect(
      getContentPlacement({ chromosome: "chr1", start: 500, end: 3_500 }, view, 1_000, 50),
    ).toEqual({ x: 50 - 1_000, width: 3_000 });
  });

  it("scales by the visible span", () => {
    expect(
      getContentPlacement({ chromosome: "chr1", start: 1_000, end: 3_000 }, view, 500, 0),
    ).toEqual({ x: -250, width: 1_000 });
  });
});
