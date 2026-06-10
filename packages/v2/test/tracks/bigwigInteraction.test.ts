import { describe, expect, it } from "vitest";
import {
  applyFillWithZero,
  condenseBigWigData,
  formatBigWigTooltip,
  getBigWigRange,
  getPointAtMouseX,
} from "../../src/tracks/bigwig/helpers";
import type { RenderedBigWigPoint } from "../../src/tracks/bigwig/types";

describe("BigWig interaction helpers", () => {
  const points: RenderedBigWigPoint[] = [
    { x: 0, min: 1, max: 1 },
    { x: 1, min: null, max: null },
    { x: 2, min: 2, max: 5 },
  ];

  it("maps local mouse x to a point", () => {
    expect(getPointAtMouseX(points, 0, 3)).toEqual(points[0]);
    expect(getPointAtMouseX(points, 2, 3)).toEqual(points[2]);
  });

  it("clamps x values to available points", () => {
    expect(getPointAtMouseX(points, -100, 3)).toEqual(points[0]);
    expect(getPointAtMouseX(points, 100, 3)).toEqual(points[2]);
  });

  it("ignores all-null points", () => {
    expect(getPointAtMouseX(points, 1, 3)).toBeUndefined();
  });

  it("formats tooltip labels", () => {
    expect(formatBigWigTooltip({ x: 0, min: 1, max: 1 })).toBe("1.00");
    expect(formatBigWigTooltip({ x: 0, min: 2, max: 5 })).toBe("5.00");
    expect(formatBigWigTooltip({ x: 0, min: null, max: 5 })).toBe("5.00");
    expect(formatBigWigTooltip({ x: 0, min: 2, max: null })).toBeUndefined();
    expect(formatBigWigTooltip({ x: 0, min: null, max: null })).toBeUndefined();
  });

  it("condenses raw BigWig data into rendered points", () => {
    const rendered = condenseBigWigData(
      [
        { chr: "chr1", start: 0, end: 25, value: 2 },
        { chr: "chr1", start: 10, end: 30, value: 5 },
        { chr: "chr1", start: 75, end: 100, value: -1 },
      ],
      { chromosome: "chr1", start: 0, end: 100 },
      4,
    );

    expect(rendered).toEqual([
      { x: 0, min: 2, max: 5 },
      { x: 1, min: 2, max: 5 },
      { x: 2, min: null, max: null },
      { x: 3, min: -1, max: -1 },
    ]);
    expect(getBigWigRange(rendered)).toEqual({ min: -1, max: 5 });
  });

  it("can fill empty rendered points with zero", () => {
    const rendered: RenderedBigWigPoint[] = [
      { x: 0, min: 1, max: 1 },
      { x: 1, min: null, max: null },
    ];

    applyFillWithZero(rendered);

    expect(rendered).toEqual([
      { x: 0, min: 1, max: 1 },
      { x: 1, min: 0, max: 0 },
    ]);
  });
});
