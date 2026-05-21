import { describe, expect, it } from "vitest";
import { createRenderWindowSignature, getRenderWindow } from "./useRenderWindow";

describe("render window", () => {
  it("computes the overscanned target region and render width", () => {
    expect(getRenderWindow({ chromosome: "chr1", start: 100, end: 200 }, 250, 3)).toEqual({
      targetRenderRegion: {
        chromosome: "chr1",
        start: 0,
        end: 300,
      },
      renderWidth: 750,
    });
  });

  it("matches the order-insensitive data signature", () => {
    const region = { chromosome: "chr1", start: 0, end: 300 };
    const tracks = [
      {
        id: "signal",
        type: "bigwig",
        title: "Signal",
        display: "full",
        height: 80,
      },
    ];

    expect(createRenderWindowSignature(region, tracks, 750)).toBe(
      JSON.stringify({ region, trackIds: JSON.stringify(["signal"]), width: 750 }),
    );
  });
});
