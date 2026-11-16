// @vitest-environment jsdom

import type { BigWigValueRecord } from "@weng-lab/genomic-reader";
import type { ComponentType } from "react";
import { afterEach, expect, it } from "vitest";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { methylCModule } from "@weng-lab/genomebrowser-tracks/methylc";
import { mountTrack, type MountedTrack } from "../mountTrack";

// Four bases across 40 units: base 0 covers x [0, 10), base 1 covers [10, 20).
const region = { chromosome: "chr1", start: 0, end: 4 };
const width = 40;
const records: BigWigValueRecord[] = [1, 2, 3, 4].map((value, start) => ({
  kind: "value",
  chromosome: "chr1",
  start,
  end: start + 1,
  value,
}));

let view: MountedTrack | undefined;
afterEach(async () => {
  await view?.unmount();
  view = undefined;
});

it("reports the BigWig base under the pointer near its right edge", async () => {
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
    data: records,
    region,
    width,
  });

  expect(await hover(view, 9.6)).toBe("Signal1.00");
  expect(tooltipItem()).toMatchObject({ x: 9, max: 1 });
  expect(hoverLine(view)).toBe("9");
});

it("reports the MethylC base under the pointer near its right edge", async () => {
  view = await mountTrack({
    module: withTooltipItem(methylCModule),
    track: {
      base: { id: "methylc", title: "MethylC", height: 80 },
      config: { urls: urls("YOUR_URL_HERE") },
    },
    data: [records, [], [], [], [], [], [], []],
    region,
    width,
  });

  expect(await hover(view, 9.6)).toBe(
    "Plus CpG1.00Plus CHGNo dataPlus CHHNo dataPlus depthNo data" +
      "Minus CpGNo dataMinus CHGNo dataMinus CHHNo dataMinus depthNo data",
  );
  expect((tooltipItem() as { tooltipValues: unknown[] }).tooltipValues[0]).toMatchObject({
    x: 9,
    max: 1,
  });
  expect(hoverLine(view)).toBe("9");
});

/** Moves the pointer over the renderer's hover surface and returns the browser tooltip text. */
async function hover(mounted: MountedTrack, clientX: number) {
  const overlay = mounted.content.querySelector<SVGRectElement>('rect[pointer-events="all"]');
  if (!overlay) throw new Error("Could not find the hover overlay");
  overlay.getBoundingClientRect = () => new DOMRect(0, 0, width, 40);
  await mounted.settle(() =>
    overlay.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX })),
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

function urls(url: string) {
  const strand = { cpg: { url }, chg: { url }, chh: { url }, depth: { url } };
  return { plusStrand: strand, minusStrand: strand };
}
