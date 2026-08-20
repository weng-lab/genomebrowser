import { describe, expect, expectTypeOf, it } from "vitest";
import { clientXToTrackX, createGenomicXScale } from "@weng-lab/genomebrowser-tracks/shared";

describe("shared coordinate helpers", () => {
  it("maps genomic endpoints and extrapolates without clamping", () => {
    const x = createGenomicXScale({ chromosome: "chr1", start: 100, end: 200 }, 500);

    expect(x(100)).toBe(0);
    expect(x(200)).toBe(500);
    expect(x(50)).toBe(-250);
    expect(x(250)).toBe(750);
    expectTypeOf(createGenomicXScale).returns.toEqualTypeOf<(position: number) => number>();
  });

  it("scales client coordinates into track coordinates", () => {
    expect(clientXToTrackX(150, { left: 100, width: 200 }, 1_000)).toBe(250);
  });

  it("returns zero for non-positive rendered width", () => {
    expect(clientXToTrackX(150, { left: 100, width: 0 }, 1_000)).toBe(0);
    expect(clientXToTrackX(150, { left: 100, width: -10 }, 1_000)).toBe(0);
  });

  it("does not clamp coordinates outside the rendered bounds", () => {
    expect(clientXToTrackX(50, { left: 100, width: 200 }, 1_000)).toBe(-250);
    expect(clientXToTrackX(350, { left: 100, width: 200 }, 1_000)).toBe(1_250);
  });
});
