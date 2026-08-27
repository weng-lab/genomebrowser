// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  createBrowserStore,
  createTrackStore,
  GenomeBrowser,
  type GenomicRegion,
} from "@weng-lab/genomebrowser";
import { bigBedModule, type BigBedRow } from "@weng-lab/genomebrowser-tracks/bigbed";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

describe("visible row-derived track height", () => {
  it("ignores denser overscan rows, then grows and shrinks after panning in both directions", async () => {
    const allRows = [
      row("left-1", 290, 310),
      row("left-2", 290, 310),
      row("left-3", 290, 310),
      row("middle", 345, 355),
      row("right-1", 390, 410),
      row("right-2", 390, 410),
      row("right-3", 390, 410),
      row("right-4", 390, 410),
    ];
    const fetch = vi.fn(async ({ demand: { region } }) =>
      allRows.filter((feature) => intersects(feature, region)),
    );
    const module = { ...bigBedModule, fetch };
    const track = bigBedModule.create({
      id: "peaks",
      title: "Peaks",
      display: "squish",
      config: { url: "YOUR_URL_HERE", rowHeight: 12 },
    });
    const trackStore = createTrackStore({ modules: [module], tracks: [track] });
    const browserStore = createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 1_000 } },
      region: { chromosome: "chr1", start: 325, end: 375 },
      trackWidth: 100,
    });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await settle(() =>
      root?.render(<GenomeBrowser browserStore={browserStore} trackStore={trackStore} />),
    );

    expect(fetch).toHaveBeenLastCalledWith(
      expect.objectContaining({
        demand: expect.objectContaining({
          region: { chromosome: "chr1", start: 275, end: 425 },
        }),
      }),
    );
    expect(trackStore.getState().getTrack("peaks")?.base.height).toBe(12);

    await panTo(browserStore, { chromosome: "chr1", start: 275, end: 325 });
    expect(trackStore.getState().getTrack("peaks")?.base.height).toBe(36);

    await panTo(browserStore, { chromosome: "chr1", start: 325, end: 375 });
    expect(trackStore.getState().getTrack("peaks")?.base.height).toBe(12);

    await panTo(browserStore, { chromosome: "chr1", start: 375, end: 425 });
    expect(trackStore.getState().getTrack("peaks")?.base.height).toBe(48);

    await panTo(browserStore, { chromosome: "chr1", start: 325, end: 375 });
    expect(trackStore.getState().getTrack("peaks")?.base.height).toBe(12);
  });
});

function row(name: string, start: number, end: number): BigBedRow {
  return { chromosome: "chr1", start, end, name, fields: [] };
}

function intersects(feature: BigBedRow, region: GenomicRegion) {
  return (
    feature.chromosome === region.chromosome &&
    feature.end > region.start &&
    feature.start < region.end
  );
}

async function panTo(browserStore: ReturnType<typeof createBrowserStore>, region: GenomicRegion) {
  await settle(() => browserStore.getState().setRegion(region));
}

async function settle(update: () => void) {
  await act(async () => {
    update();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}
