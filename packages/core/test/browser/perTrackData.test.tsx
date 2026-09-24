// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { GenomeBrowser } from "../../src/browser/GenomeBrowser";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { createTrackStore } from "../../src/browser/state/trackStore";
import { defineTrackModule } from "../../src/modules/defineTrackModule";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const MARGIN = 100;

let container: HTMLDivElement | undefined;
let root: Root | undefined;
/** Track IDs whose requests stay pending until `release` resolves them. */
let held = new Set<string>();
let pending: { id: string; resolve: () => void }[] = [];

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  held = new Set();
  pending = [];
});

function Renderer({ id }: { id: string }) {
  return <rect data-testid={`render-${id}`} />;
}

const fetch = vi.fn(
  ({ track }: { track: { base: { id: string } } }) =>
    new Promise<string>((resolve) => {
      const id = track.base.id;
      if (held.has(id)) pending.push({ id, resolve: () => resolve(id) });
      else resolve(id);
    }),
);

const module = defineTrackModule({
  type: "per-track-test",
  configSchema: z.object({}),
  fetch,
  render: { full: Renderer },
});

/** A 1000px track where one pixel is one base, showing 1000-2000 of a 10 kb chromosome. */
async function mountBrowser() {
  fetch.mockClear();
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10_000 } },
    region: { chromosome: "chr1", start: 1_000, end: 2_000 },
    marginWidth: MARGIN,
    trackWidth: 1_000,
  });
  const trackStore = createTrackStore({
    modules: [module],
    tracks: ["fast", "slow"].map((id) => module.create({ base: { id, title: id }, config: {} })),
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
    ),
  );
  const svg = container.querySelector<SVGSVGElement>("#browserSVG");
  if (!svg) throw new Error("Expected the browser SVG");
  installSvgCoordinates(svg);
  return { browserStore, svg };
}

/** The x translation of a track's content group. */
function contentX(trackId: string) {
  let node = container?.querySelector(`[data-testid="render-${trackId}"]`)?.parentElement;
  while (node && !node.parentElement?.hasAttribute("clip-path")) node = node.parentElement;
  const match = node?.getAttribute("transform")?.match(/translate\(([-\d.e]+),/);
  if (!match) throw new Error(`No content transform for ${trackId}`);
  return Number(match[1]);
}

function isBlocked() {
  return container?.querySelector('[role="status"]') !== null;
}

function panTarget(svg: SVGSVGElement) {
  const target = Array.from(svg.querySelectorAll<SVGGElement>("g")).find(
    (group) => group.style.cursor === "grab",
  );
  if (!target) throw new Error("Expected a pannable track");
  installPointerCapture(target);
  return target;
}

async function drag(target: SVGGElement, fromX: number, toX: number) {
  await act(async () => {
    target.dispatchEvent(pointerEvent("pointerdown", fromX));
    target.dispatchEvent(pointerEvent("pointermove", toX));
  });
  return {
    release: () =>
      act(async () => {
        target.dispatchEvent(pointerEvent("pointerup", toX));
      }),
  };
}

async function release(trackId: string) {
  await act(async () => {
    for (const request of pending.filter((entry) => entry.id === trackId)) request.resolve();
  });
}

describe("per-track data", () => {
  it("places each track from its own data after a committed pan", async () => {
    const { browserStore, svg } = await mountBrowser();
    // Both tracks loaded 0-3000, so content starts 1000px left of the view.
    expect(contentX("fast")).toBe(MARGIN - 1_000);
    expect(contentX("slow")).toBe(MARGIN - 1_000);

    held.add("slow");
    const gesture = await drag(panTarget(svg), 800, 200);
    const draggedX = contentX("slow");
    expect(draggedX).toBe(MARGIN - 1_600);
    await gesture.release();

    const view = browserStore.getState().region;
    expect(view).toEqual({ chromosome: "chr1", start: 1_600, end: 2_600 });
    // The slow track keeps its old data exactly where the drag left it.
    expect(contentX("slow")).toBe(draggedX);
    // The fast track already shows data for 600-3600, placed from its own region.
    expect(contentX("fast")).toBe(MARGIN + (600 - view.start));

    await release("slow");
    expect(contentX("slow")).toBe(MARGIN + (600 - view.start));
  });

  it("blocks interaction until every track has loaded, while showing loaded tracks", async () => {
    const { browserStore, svg } = await mountBrowser();
    expect(isBlocked()).toBe(false);
    const target = panTarget(svg);

    held.add("slow");
    await act(async () => {
      browserStore.getState().setRegion({ chromosome: "chr1", start: 1_000, end: 1_500 });
    });

    expect(container?.querySelector('[data-testid="render-fast"]')).not.toBeNull();
    expect(container?.querySelector('[data-testid="render-slow"]')).toBeNull();
    expect(isBlocked()).toBe(true);
    const before = browserStore.getState().region;
    const gesture = await drag(target, 800, 200);
    await gesture.release();
    expect(browserStore.getState().region).toBe(before);

    await release("slow");
    expect(container?.querySelector('[data-testid="render-slow"]')).not.toBeNull();
    expect(isBlocked()).toBe(false);
  });

  it("blocks in the same render that commits a pan needing data", async () => {
    const { svg } = await mountBrowser();
    held.add("slow");
    held.add("fast");

    const gesture = await drag(panTarget(svg), 800, 200);
    await gesture.release();

    expect(isBlocked()).toBe(true);
  });

  it("does not fetch or block for a pan inside the pre-loaded margin", async () => {
    const { browserStore, svg } = await mountBrowser();

    const gesture = await drag(panTarget(svg), 500, 300);
    await gesture.release();

    expect(browserStore.getState().region).toEqual({
      chromosome: "chr1",
      start: 1_200,
      end: 2_200,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(isBlocked()).toBe(false);
  });

  it("stops a drag at the edge of the loaded data", async () => {
    const { browserStore, svg } = await mountBrowser();

    // Data reaches 1000 bases past each edge; a 1500px drag stops at 1000.
    const gesture = await drag(panTarget(svg), 100, 1_600);
    expect(contentX("fast")).toBe(MARGIN);
    await gesture.release();

    expect(browserStore.getState().region).toEqual({ chromosome: "chr1", start: 0, end: 1_000 });
  });

  it("stops a wheel pan at the edge of the loaded data", async () => {
    vi.useFakeTimers();
    try {
      const { browserStore, svg } = await mountBrowser();

      await act(async () => {
        svg.dispatchEvent(new WheelEvent("wheel", { deltaX: 1_500, cancelable: true }));
      });
      expect(contentX("fast")).toBe(MARGIN - 2_000);
      // Reversing at the edge moves back at once instead of unwinding the overshoot.
      await act(async () => {
        svg.dispatchEvent(new WheelEvent("wheel", { deltaX: -100, cancelable: true }));
      });
      expect(contentX("fast")).toBe(MARGIN - 1_900);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      expect(browserStore.getState().region).toEqual({
        chromosome: "chr1",
        start: 1_900,
        end: 2_900,
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

function installSvgCoordinates(svg: SVGSVGElement) {
  const point = { x: 0, y: 0, matrixTransform: () => ({ x: point.x, y: point.y }) };
  Object.assign(svg, {
    createSVGPoint: () => point,
    getScreenCTM: () => ({ inverse: () => ({}) }),
  });
}

function installPointerCapture(element: SVGGElement) {
  let capturedPointerId: number | null = null;
  Object.assign(element, {
    hasPointerCapture: (pointerId: number) => capturedPointerId === pointerId,
    releasePointerCapture: () => {
      capturedPointerId = null;
    },
    setPointerCapture: (pointerId: number) => {
      capturedPointerId = pointerId;
    },
  });
}

function pointerEvent(type: string, clientX: number) {
  const event = new MouseEvent(type, { bubbles: true, button: 0, clientX, clientY: 0 });
  Object.defineProperties(event, { isPrimary: { value: true }, pointerId: { value: 1 } });
  return event;
}
