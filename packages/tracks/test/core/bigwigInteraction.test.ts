import { describe, expect, it } from "vitest";
import { bigWigModule } from "../../src/bigwig";
import {
  applyFillWithZero,
  formatBigWigTooltip,
  getBigWigRange,
  getPointAtMouseX,
} from "../../src/bigwig/helpers";
import type { SignalPoint } from "../../src/shared/signal";

describe("BigWig interaction helpers", () => {
  const points: SignalPoint[] = [
    { x: 0, min: 1, max: 1 },
    { x: 1, min: null, max: null },
    { x: 2, min: 2, max: 5 },
  ];

  it("defines tooltip UI on the module", () => {
    const config = bigWigModule.create({
      id: "signal",
      title: "Signal",
      config: { url: "YOUR_URL_HERE" },
    });

    expect(bigWigModule.tooltipComponent).toBeTypeOf("function");
    expect(config).not.toHaveProperty("tooltip");
  });

  it("maps local mouse x to a point", () => {
    expect(getPointAtMouseX(points, 0, 3)).toEqual(points[0]);
    expect(getPointAtMouseX(points, 2, 3)).toEqual(points[2]);
  });

  it("clamps x values to available points", () => {
    expect(getPointAtMouseX(points, -100, 3)).toEqual(points[0]);
    expect(getPointAtMouseX(points, 100, 3)).toEqual(points[2]);
  });

  it("returns all-null pixels for stable no-data tooltips", () => {
    expect(getPointAtMouseX(points, 1, 3)).toEqual(points[1]);
  });

  it("formats tooltip labels", () => {
    expect(formatBigWigTooltip({ x: 0, min: 1, max: 1 })).toBe("1.00");
    expect(formatBigWigTooltip({ x: 0, min: 2, max: 5 })).toBe("5.00");
    expect(formatBigWigTooltip({ x: 0, min: null, max: 5 })).toBe("5.00");
    expect(formatBigWigTooltip({ x: 0, min: 2, max: null })).toBe("No data");
    expect(formatBigWigTooltip({ x: 0, min: null, max: null })).toBe("No data");
  });

  it("can fill empty rendered points with zero", () => {
    const rendered: SignalPoint[] = [
      { x: 0, min: 1, max: 1 },
      { x: 1, min: null, max: null },
    ];

    applyFillWithZero(rendered);

    expect(rendered).toEqual([
      { x: 0, min: 1, max: 1 },
      { x: 1, min: 0, max: 0 },
    ]);
  });

  it("produces a valid automatic range for a constant negative signal", () => {
    expect(getBigWigRange([{ x: 0, min: -2, max: -2 }])).toEqual({ min: -2, max: 0 });
  });
});
