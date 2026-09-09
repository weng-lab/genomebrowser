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
