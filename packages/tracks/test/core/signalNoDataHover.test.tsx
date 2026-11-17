// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { caveModule } from "@weng-lab/genomebrowser-tracks/cave";
import { mountTrack, type MountedTrack } from "../mountTrack";

const region = { chromosome: "chr1", start: 0, end: 100 };

describe("signal renderer no-data hover", () => {
  it("shows a BigWig tooltip for an actual empty rendered pixel without firing data callbacks", async () => {
    const onHover = vi.fn<(item: unknown) => void>();
    const view = await mountTrack({
      module: bigWigModule,
      track: {
        base: { id: "signal", title: "Signal", color: "#000000", height: 40 },
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

    expect(await hoverOverlay(view)).toBe("SignalNo data");
    expect(view.tooltipItem).toEqual({ x: 1, min: null, max: null });
    expect(hoverLine(view)).toBe("1");
    expect(onHover).not.toHaveBeenCalled();
  });

  it("shows a CAVE tooltip with both actual empty channel pixels without firing data callbacks", async () => {
    const onHover = vi.fn<(item: unknown) => void>();
    const view = await mountTrack({
      module: caveModule,
      track: {
        base: { id: "cave", title: "CAVE", color: "#000000", height: 40 },
        config: {
          neurotransmitter: "GABA",
          age: "Adulthood",
          topColor: "#000000",
          bottomColor: "#000000",
        },
      },
      interaction: { onHover },
      data: { top: [], bottom: [] },
      region,
      width: 4,
    });

    expect(await hoverOverlay(view)).toBe("hmCNo dataOXBSNo data");
    expect(view.tooltipItem).toEqual({
      x: 1,
      top: { x: 1, min: null, max: null },
      bottom: { x: 1, min: null, max: null },
    });
    expect(hoverLine(view)).toBe("1");
    expect(onHover).not.toHaveBeenCalled();
  });
});

/** Moves the pointer to x = 1 over the renderer's hover surface and returns the tooltip text. */
function hoverOverlay(mounted: MountedTrack) {
  const overlay = mounted.content.querySelector<SVGRectElement>('rect[pointer-events="all"]');
  if (!overlay) throw new Error("Could not find the hover overlay");
  overlay.getBoundingClientRect = () => new DOMRect(0, 0, 4, 40);
  return mounted.move(overlay, { clientX: 1 });
}

/** The x of the hover line the renderer draws at the hovered pixel. */
function hoverLine(mounted: MountedTrack) {
  return mounted.content.querySelector('line[stroke="#000000"]')?.getAttribute("x1");
}
