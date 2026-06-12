import { describe, expect, it } from "vitest";
import { getHighlightRects } from "../../src/browser/overlays/highlightRects";

describe("highlight overlay", () => {
  const region = { chromosome: "chr1", start: 100, end: 200 };

  it("renders current-chromosome highlights", () => {
    expect(
      getHighlightRects({
        region,
        width: 1000,
        highlights: [
          {
            id: "target",
            region: { chromosome: "chr1", start: 120, end: 140 },
            color: "#ff0000",
            opacity: 0.4,
          },
        ],
      }),
    ).toEqual([
      {
        id: "target",
        x: 200,
        width: 200,
        color: "#ff0000",
        opacity: 0.4,
      },
    ]);
  });

  it("skips highlights on other chromosomes", () => {
    expect(
      getHighlightRects({
        region,
        width: 1000,
        highlights: [
          {
            id: "other",
            region: { chromosome: "chr2", start: 120, end: 140 },
            color: "#ff0000",
          },
        ],
      }),
    ).toEqual([]);
  });

  it("treats missing chromosome as the current chromosome", () => {
    expect(
      getHighlightRects({
        region,
        width: 1000,
        highlights: [
          {
            id: "implicit",
            region: { start: 150, end: 175 },
            color: "#00ff00",
          },
        ],
      }),
    ).toEqual([
      {
        id: "implicit",
        x: 500,
        width: 250,
        color: "#00ff00",
        opacity: 0.2,
      },
    ]);
  });
});
