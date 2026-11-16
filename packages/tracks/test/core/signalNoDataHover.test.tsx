// @vitest-environment jsdom

import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { caveModule } from "@weng-lab/genomebrowser-tracks/cave";
import { mountTrack, type MountedTrack } from "../mountTrack";

const region = { chromosome: "chr1", start: 0, end: 100 };

let view: MountedTrack | undefined;
afterEach(async () => {
  await view?.unmount();
  view = undefined;
});

describe("signal renderer no-data hover", () => {
  it("shows a BigWig tooltip for an actual empty rendered pixel without firing data callbacks", async () => {
    const onHover = vi.fn<(item: unknown) => void>();
    view = await mountTrack({
      module: withTooltipItem(bigWigModule),
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
    expect(tooltipItem()).toEqual({ x: 1, min: null, max: null });
    expect(hoverLine(view)).toBe("1");
    expect(onHover).not.toHaveBeenCalled();
  });

  it("shows a CAVE tooltip with both actual empty channel pixels without firing data callbacks", async () => {
    const onHover = vi.fn<(item: unknown) => void>();
    view = await mountTrack({
      module: withTooltipItem(caveModule),
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
    expect(tooltipItem()).toEqual({
      x: 1,
      top: { x: 1, min: null, max: null },
      bottom: { x: 1, min: null, max: null },
    });
    expect(hoverLine(view)).toBe("1");
    expect(onHover).not.toHaveBeenCalled();
  });
});

/** Moves the pointer to x = 1 over the renderer's hover surface and returns the tooltip text. */
async function hoverOverlay(mounted: MountedTrack) {
  const overlay = mounted.content.querySelector<SVGRectElement>('rect[pointer-events="all"]');
  if (!overlay) throw new Error("Could not find the hover overlay");
  overlay.getBoundingClientRect = () => new DOMRect(0, 0, 4, 40);
  await mounted.settle(() =>
    overlay.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 1 })),
  );
  return document.querySelector("[data-tooltip-text]")?.textContent ?? "";
}

/**
 * Adds the hovered item beside the module's own tooltip. The item is the payload any
 * custom `tooltipComponent` receives, so its fields are contract, not only its text.
 */
function withTooltipItem<M extends { tooltipComponent?: unknown }>(module: M): M {
  const Tooltip = module.tooltipComponent as ComponentType<{ item: unknown }>;
  const tooltipComponent = (props: { item: unknown }) => (
    <>
      <g data-tooltip-text="">
        <Tooltip {...props} />
      </g>
      <desc data-tooltip-item="">{JSON.stringify(props.item)}</desc>
    </>
  );
  return { ...module, tooltipComponent };
}

/** The item the browser handed to the tooltip it is showing. */
function tooltipItem() {
  const item = document.querySelector("[data-tooltip-item]")?.textContent;
  if (!item) throw new Error("No tooltip is showing");
  return JSON.parse(item) as unknown;
}

/** The x of the hover line the renderer draws at the hovered pixel. */
function hoverLine(mounted: MountedTrack) {
  return mounted.content.querySelector('line[stroke="#000000"]')?.getAttribute("x1");
}
