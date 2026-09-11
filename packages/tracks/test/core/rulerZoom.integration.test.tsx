// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserStore, createTrackStore, GenomeBrowser } from "@weng-lab/genomebrowser";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";
import { expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

it.each([
  { start: 53_370_000, end: 53_380_000 },
  { start: 40_000_000, end: 60_000_000 },
])("bounds ruler ticks during a delayed zoom from $start–$end to 50 bases", async (previous) => {
  const pending: Array<(reason: Error) => void> = [];
  const fetch = vi.fn(() => new Promise<Response>((_resolve, reject) => pending.push(reject)));
  vi.stubGlobal("fetch", fetch);
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr12: 133_275_309 } },
    region: { chromosome: "chr12", ...previous },
    trackWidth: 1000,
  });
  const trackStore = createTrackStore({
    modules: [rulerModule],
    tracks: [
      rulerModule.create({
        id: "ruler",
        title: "Ruler",
        config: { sequenceUrl: "https://example.test/ref.2bit" },
      }),
    ],
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const tickPositions = () =>
    Array.from(container.querySelectorAll('[aria-label="Genomic ruler"] text'), (node) =>
      Number(node.textContent?.replaceAll(",", "")),
    );
  const next = { chromosome: "chr12", start: 53_375_000, end: 53_375_050 };
  try {
    await act(async () =>
      root.render(<GenomeBrowser browserStore={browserStore} trackStore={trackStore} />),
    );
    expect(fetch).not.toHaveBeenCalled();
    await act(async () => {
      browserStore.getState().setRegion(next);
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    // Old wide-window data is hidden immediately until the zoom request settles.
    expect(tickPositions()).toEqual([]);
    expect(container.querySelectorAll("svg *").length).toBeLessThan(250);
    await act(async () => {
      pending.forEach((reject) => reject(new Error("Sequence unavailable")));
    });
    const ticks = tickPositions();
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.length).toBeLessThan(30);
    expect(container.querySelectorAll("svg *").length).toBeLessThan(250);
    expect(Math.min(...ticks)).toBeGreaterThanOrEqual(next.start - 50);
    expect(Math.min(...ticks)).toBeLessThan(next.start);
    expect(Math.max(...ticks)).toBeGreaterThan(next.end);
    expect(Math.max(...ticks)).toBeLessThan(next.end + 50);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});

it.each(["pointerup", "pointercancel"])(
  "finishes a ruler drag before restoring pan on %s",
  async (finishEvent) => {
    vi.useFakeTimers();
    const region = { chromosome: "chr1", start: 100, end: 1100 };
    const browserStore = createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 10000 } },
      region,
      marginWidth: 100,
      trackWidth: 1000,
    });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ records: [] })
      .mockImplementation(() => new Promise(() => {}));
    const trackStore = createTrackStore({
      modules: [{ ...rulerModule, fetch }],
      tracks: [rulerModule.create({ id: "ruler", title: "Ruler", config: {} })],
    });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(<GenomeBrowser browserStore={browserStore} trackStore={trackStore} />);
      });
      const area = container.querySelector<SVGRectElement>("[data-ruler-zoom-area]")!;
      vi.spyOn(area, "getBoundingClientRect").mockReturnValue(new DOMRect(100, 0, 1000, 22));
      const point = { x: 0, y: 0, matrixTransform: () => ({ x: point.x, y: point.y }) };
      Object.assign(area.ownerSVGElement!, {
        createSVGPoint: () => point,
        getScreenCTM: () => ({ inverse: () => ({}) }),
      });
      await act(async () => {
        area.dispatchEvent(
          new MouseEvent("pointermove", { bubbles: true, clientX: 200, clientY: 10 }),
        );
      });
      expect(browserStore.getState().selectionMode).toBe("zoom");
      await act(async () => {
        area.dispatchEvent(
          new MouseEvent("pointerdown", { bubbles: true, clientX: 200, clientY: 10, buttons: 1 }),
        );
      });
      await act(async () => {
        document.dispatchEvent(
          new MouseEvent("pointermove", { clientX: 400, clientY: 10, buttons: 1 }),
        );
      });
      expect(container.querySelector("[data-region-selection]")).not.toBeNull();
      await act(async () => {
        document.dispatchEvent(new MouseEvent(finishEvent, { clientX: 400, clientY: 10 }));
        // Native listeners may have a microtask checkpoint between them. Mode
        // restoration must wait for the next task, not just a microtask.
        await Promise.resolve();
      });
      expect(browserStore.getState().selectionMode).toBe("zoom");
      expect(browserStore.getState().region).toEqual(
        finishEvent === "pointerup" ? { chromosome: "chr1", start: 200, end: 400 } : region,
      );
      if (finishEvent === "pointerup") {
        expect(container.querySelector("[data-ruler-zoom-area]")).toBeNull();
      }
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      expect(browserStore.getState().selectionMode).toBe("pan");
      expect(container.querySelector("[data-region-selection]")).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
      vi.useRealTimers();
    }
  },
);
