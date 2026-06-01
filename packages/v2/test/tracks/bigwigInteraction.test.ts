import { describe, expect, it } from "vitest";
import { formatBigWigTooltip, getPointAtMouseX } from "../../src/tracks/bigwig/helpers";
import type { ValuedPoint } from "../../src/tracks/bigwig/types";

describe("BigWig interaction helpers", () => {
  const points: ValuedPoint[] = [
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
});
