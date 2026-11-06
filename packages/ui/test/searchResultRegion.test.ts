import { describe, expect, it } from "vitest";
import { getSearchResultRegion } from "../src/lib";

describe("getSearchResultRegion", () => {
  it("reads typed coordinates as one-based and feature domains as browser regions", () => {
    expect(
      getSearchResultRegion({
        type: "Coordinate",
        domain: { chromosome: "chr1", start: 101, end: 200 },
      }),
    ).toEqual({ chromosome: "chr1", start: 100, end: 200 });
    expect(
      getSearchResultRegion({
        type: "Gene",
        domain: { chromosome: "chr12", start: 53_372_921, end: 53_423_700 },
      }),
    ).toEqual({ chromosome: "chr12", start: 53_372_921, end: 53_423_700 });
    expect(getSearchResultRegion({ type: "Gene", title: "No location" })).toBeUndefined();
  });
});
