// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { z } from "zod";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import {
  GenomeBrowser,
  TrackLabel,
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
} from "../../src/lib";

const message = "Reference unavailable; showing CIGAR-defined mismatches only.";
const module = defineTrackModule({
  type: "message-test",
  configSchema: z.object({ y: z.number().optional() }),
  fetch: async () => null,
  render: {
    full: ({ config }: { config: { y?: number } }) => (
      <>
        <TrackLabel anchor="center" y={config.y} overflow="truncate">
          {message}
        </TrackLabel>
        <TrackLabel anchor="top-right">100</TrackLabel>
      </>
    ),
  },
});
let probe: Probe | undefined;
afterEach(() => probe?.unmount());

it("centers messages, restores full text after resizing, and permits panning from truncated text", async () => {
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 1000, end: 2000 },
    trackWidth: 200,
  });
  const trackStore = createTrackStore({
    modules: [module],
    tracks: [module.create({ base: { id: "status", title: "Status", height: 80 }, config: {} })],
  });
  probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
  );
  const label = document.querySelector<SVGTextElement>("text[aria-label]")!;
  expect(label.textContent).toMatch(/…$/);
  expect(label.getAttribute("aria-label")).toBe(message);
  expect(label.parentElement?.querySelector("title")?.textContent).toBe(message);
  expect(label.getAttribute("x")).toBe("100");
  expect(label.parentElement?.querySelector("rect")?.getAttribute("y")).toBe("33");
  expect(label.parentElement?.getAttribute("pointer-events")).toBe("auto");

  const svg = document.querySelector<SVGSVGElement>("#browserSVG")!;
  const point = { x: 0, y: 0, matrixTransform: () => ({ x: point.x, y: point.y }) };
  Object.assign(svg, {
    createSVGPoint: () => point,
    getScreenCTM: () => ({ inverse: () => ({}) }),
  });
  const pan = Array.from(svg.querySelectorAll("g")).find((g) => g.style.cursor === "grab")!;
  Object.assign(pan, {
    setPointerCapture: () => {},
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
  });
  const pointer = (type: string, clientX: number) => {
    const event = new MouseEvent(type, { bubbles: true, clientX });
    Object.assign(event, { pointerId: 1, isPrimary: true });
    label.dispatchEvent(event);
  };
  await probe.measure(() => pointer("pointerdown", 200));
  // Pointer movement changes the content transform without updating label geometry.
  const drag = await probe.measure(() => pointer("pointermove", 180));
  expect(drag.pick("TrackLabel", "TrackOverlay")).toMatchInlineSnapshot(`
    {
      "TrackLabel": 0,
      "TrackOverlay": 0,
    }
  `);
  expect(label.getAttribute("x")).toBe("100");
  await probe.measure(() => pointer("pointerup", 180));
  expect(browserStore.getState().region.start).toBe(1100);

  await probe.measure(() => browserStore.getState().setTrackWidth(800));
  expect(label.textContent).toBe(message);
  expect(label.getAttribute("x")).toBe("400");
  expect(label.parentElement?.querySelector("title")).toBeNull();
  expect(label.getAttribute("aria-label")).toBeNull();
  await probe.measure(() => trackStore.getState().updateTrack("status", { config: { y: 7 } }));
  expect(label.parentElement?.querySelector("rect")?.getAttribute("y")).toBe("0");
  await probe.measure(() => browserStore.getState().setTrackWidth(25));
  expect(label.textContent).toBe("…");
  expect(Array.from(svg.querySelectorAll("text")).some((text) => text.textContent === "100")).toBe(
    false,
  );
});
