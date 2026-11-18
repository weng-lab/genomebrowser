// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { caveModule } from "@weng-lab/genomebrowser-tracks/cave";
import { mountTrack } from "../mountTrack";
import { hoverLine, hoverSignal } from "./signalHover";

const region = { chromosome: "chr1", start: 0, end: 100 };

describe("signal renderer no-data hover", () => {
  it("shows a BigWig tooltip for an actual empty rendered pixel without firing data callbacks", async () => {
    const onHover = vi.fn<(item: unknown) => void>();
    const view = await mountTrack({
      module: bigWigModule,
      track: {
        base: { id: "signal", title: "Signal", color: "#2266aa", height: 40 },
        config: {
          url: "YOUR_URL_HERE",
          fillWithZero: false,
          showClampIndicators: true,
          clampIndicatorColor: "#ff0000",
        },
      },
      interaction: { onHover },
      data: [],
      region,
      width: 4,
    });

    expect(await hoverSignal(view, 1, 4)).toBe("SignalNo data");
    expect(view.tooltipItem).toEqual({ x: 1, min: null, max: null });
    expect(hoverLine(view)).toBe("1");
    expect(onHover).not.toHaveBeenCalled();
  });

  it("shows a CAVE tooltip with both actual empty channel pixels without firing data callbacks", async () => {
    const onHover = vi.fn<(item: unknown) => void>();
    const view = await mountTrack({
      module: caveModule,
      track: {
        base: { id: "cave", title: "CAVE", color: "#2266aa", height: 40 },
        config: {
          neurotransmitter: "GABA",
          age: "Adulthood",
          topColor: "#2266aa",
          bottomColor: "#aa6622",
        },
      },
      interaction: { onHover },
      data: { top: [], bottom: [] },
      region,
      width: 4,
    });

    expect(await hoverSignal(view, 1, 4)).toBe("hmCNo dataOXBSNo data");
    expect(view.tooltipItem).toEqual({
      x: 1,
      top: { x: 1, min: null, max: null },
      bottom: { x: 1, min: null, max: null },
    });
    expect(hoverLine(view)).toBe("1");
    expect(onHover).not.toHaveBeenCalled();
  });
});
