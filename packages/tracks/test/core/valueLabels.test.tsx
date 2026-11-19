// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { mountTrack, type MountedTrack } from "../mountTrack";

const region = { chromosome: "chr1", start: 0, end: 300 };
const config = bigWigModule.create({
  base: {
    id: "signal",
    title: "Signal",
  },
  config: { url: "YOUR_URL_HERE", yRange: { min: -2 } },
}).config;
const data = [
  { kind: "value" as const, ...region, start: 0, end: 100, value: 1000 },
  { kind: "value" as const, ...region, start: 100, end: 200, value: 5 },
];

/** Fixed labels the track draws in its plot overlay, leaving out the track title. */
function labels(view: MountedTrack) {
  return Array.from(view.container.querySelectorAll("[data-track-id] text")).filter(
    (text) => !text.closest("[data-export-title]") && !view.content.contains(text),
  );
}

async function mountSignal(display: "full" | "dense") {
  return mountTrack({
    module: bigWigModule,
    track: {
      base: { id: "signal", title: "Signal", color: "#2266aa", height: 100, display },
      config,
    },
    data,
    region,
    visibleRegion: { ...region, start: 100, end: 200 },
    width: 900,
  });
}

/** A BigWig plot from -1 to 1 puts its zero tick midway between the endpoints. */
async function mountSymmetric(height: number) {
  return mountTrack({
    module: bigWigModule,
    track: {
      base: { id: "signal", title: "Signal", color: "#2266aa", height },
      config: { ...config, yRange: { min: -1, max: 1 } },
    },
    data,
    region,
    width: 900,
  });
}

describe("renderer value labels", () => {
  it("labels the effective viewport range rather than overscanned data", async () => {
    const text = labels(await mountSignal("full")).map((label) => label.textContent);
    expect(text).toContain("5");
    expect(text).toContain("-2");
    expect(text).toContain("0");
    expect(text).not.toContain("1000");
  });

  it("omits vertical labels for an intensity display", async () => {
    expect(labels(await mountSignal("dense"))).toHaveLength(0);
  });

  it("keeps endpoint labels inside short tracks and suppresses colliding middle labels", async () => {
    const shown = labels(await mountSymmetric(35));
    expect(shown.map((label) => label.textContent)).toEqual(["1", "-1"]);
    // Each label sits on a 14 px box; the bottom one must end inside the 35 px track.
    const box = shown[1]?.closest("g")?.querySelector("rect");
    const top = Number(box?.getAttribute("y"));
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top + Number(box?.getAttribute("height"))).toBeLessThanOrEqual(35);
    expect(labels(await mountSymmetric(10))).toHaveLength(0);
  });
});
