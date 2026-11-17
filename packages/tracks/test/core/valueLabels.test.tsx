// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineTrackModule } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { ValueLabels } from "../../src/shared/ValueLabels";
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

const ticks = [
  { value: 1, y: 0 },
  { value: 0, y: 35 },
  { value: 0.5, y: 17.5 },
];
const labelsModule = defineTrackModule({
  type: "value-labels",
  configSchema: z.object({}),
  fetch: async () => null,
  render: {
    full: ({ height }: { height: number }) => <ValueLabels height={height} ticks={ticks} />,
  },
});

async function mountLabels(height: number) {
  return mountTrack({
    module: labelsModule,
    track: { base: { id: "labels", title: "Labels", height }, config: {} },
    data: null,
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
    const shown = labels(await mountLabels(35));
    expect(shown.map((label) => label.textContent)).toEqual(["1", "0"]);
    // A 14 px label for the bottom tick of a 35 px track sits at 35 - 14 = 21.
    expect(shown[1]?.previousElementSibling?.getAttribute("y")).toBe("21");
    expect(labels(await mountLabels(10))).toHaveLength(0);
  });
});
