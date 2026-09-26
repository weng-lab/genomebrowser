// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  GenomeBrowser,
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
  useBasePairDetail,
  type TrackFetchContext,
} from "../../src/lib";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
let root: Root | undefined;
let container: HTMLDivElement;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function DetailRenderer({ data, id }: { data: boolean; id: string }) {
  const show = useBasePairDetail();
  return <text data-detail={id}>{show && data ? "bases" : "signal"}</text>;
}
function fixture(span = 100, width = 1000) {
  const fetch = vi.fn(async ({ demand }: TrackFetchContext<{}>) => demand.basePairDetail);
  const module = defineTrackModule({
    type: "detail-test",
    configSchema: z.object({}),
    fetch,
    render: { full: DetailRenderer },
  });
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 0, end: span },
    trackWidth: width,
  });
  const trackStore = createTrackStore({
    modules: [module],
    tracks: ["a", "b"].map((id) => module.create({ base: { id, title: id }, config: {} })),
  });
  return { fetch, browserStore, trackStore, module };
}
async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
}
function expectDetails(values: string[]) {
  expect([...container.querySelectorAll("[data-detail]")].map((n) => n.textContent)).toEqual(
    values,
  );
}
it("uses the viewport cutoff for fetching and updates retained data when the setting changes", async () => {
  const f = fixture(101);
  await mount();
  await act(async () => root?.render(<GenomeBrowser sizing="fixed" {...f} />));
  expectDetails(["signal", "signal"]);
  expect(f.fetch.mock.calls[0]?.[0].demand.basePairDetail).toBe(false);
  // Same genomic demand, but the central setting now requires sequence data.
  await act(async () => {
    f.browserStore.getState().setBasePairDetail({ maxVisibleBases: 101 });
  });
  expectDetails(["bases", "bases"]);
  expect(f.fetch).toHaveBeenCalledTimes(4);
  expect(f.fetch.mock.calls[2]?.[0].demand.region).toEqual({
    chromosome: "chr1",
    start: 0,
    end: 202,
  });
  await act(async () => {
    f.browserStore.getState().setBasePairDetail({ maxVisibleBases: 100 });
  });
  expectDetails(["signal", "signal"]);
  await act(async () => {
    f.browserStore.getState().setRegion({ chromosome: "chr1", start: 200, end: 300 });
  });
  expectDetails(["bases", "bases"]);
  expect(f.fetch.mock.calls.at(-1)?.[0].demand.region).toEqual({
    chromosome: "chr1",
    start: 100,
    end: 400,
  });
  const requests = f.fetch.mock.calls.length;
  await act(async () => {
    f.browserStore.getState().setRegion({ chromosome: "chr1", start: 210, end: 310 });
  });
  expectDetails(["bases", "bases"]);
  expect(f.fetch).toHaveBeenCalledTimes(requests);
  // A newly added track fetches a different render window from its retained neighbors.
  await act(async () => {
    f.trackStore
      .getState()
      .addTrack(f.module.create({ base: { id: "c", title: "c" }, config: {} }));
  });
  expect(f.fetch.mock.calls.at(-1)?.[0].demand.region).toEqual({
    chromosome: "chr1",
    start: 110,
    end: 410,
  });
  expectDetails(["bases", "bases", "bases"]);
});
it("buffers width changes and keeps fetching eligibility independent of letter visibility", async () => {
  vi.useFakeTimers();
  const f = fixture(100, 800);
  await mount();
  await act(async () => root?.render(<GenomeBrowser sizing="fixed" {...f} />));
  expectDetails(["bases", "bases"]);
  const resize = async (width: number, visible: boolean) => {
    await act(async () => {
      f.browserStore.getState().setTrackWidth(width);
    });
    expectDetails(visible ? ["bases", "bases"] : ["signal", "signal"]);
  };
  await resize(700, true);
  await resize(600, true);
  await resize(599, false);
  await resize(700, false);
  await resize(799, false);
  expect(f.fetch).toHaveBeenCalledTimes(2);
  await act(async () => vi.advanceTimersByTimeAsync(200));
  expectDetails(["signal", "signal"]);
  expect(f.fetch.mock.calls.every(([context]) => context.demand.basePairDetail)).toBe(true);
  await resize(800, true);
  // New eligible viewport starts hidden if it is too narrow, even though fetching prepares detail.
  await resize(500, false);
  await act(async () => {
    f.browserStore.getState().setRegion({ chromosome: "chr1", start: 0, end: 50 });
  });
  expectDetails(["bases", "bases"]);
});
it("keeps responsive widths and scale local to each browser sharing stores", async () => {
  const observers: Array<(width: number) => void> = [];
  class Observer {
    constructor(callback: ResizeObserverCallback) {
      observers.push((width) =>
        callback(
          [{ contentRect: { width } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        ),
      );
    }
    observe() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", Observer);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1050);
  const f = fixture();
  await mount();
  const render = (scale: number) =>
    root?.render(
      <>
        <GenomeBrowser {...f} scale={scale} />
        <GenomeBrowser {...f} scale={2} />
        <GenomeBrowser {...f} sizing="fixed" scale={scale} />
      </>,
    );
  await act(async () => render(1));
  expectDetails(["bases", "bases", "signal", "signal", "bases", "bases"]);
  await act(async () => observers[0]?.(550));
  expectDetails(["signal", "signal", "signal", "signal", "bases", "bases"]);
  await act(async () => observers[0]?.(1050));
  expectDetails(["bases", "bases", "signal", "signal", "bases", "bases"]);
  await act(async () => render(2));
  expectDetails(["signal", "signal", "signal", "signal", "bases", "bases"]);
});
it("ignores an obsolete detail request after the setting changes again", async () => {
  const f = fixture();
  f.browserStore.getState().setBasePairDetail({ maxVisibleBases: 50 });
  await mount();
  await act(async () => root?.render(<GenomeBrowser sizing="fixed" {...f} />));
  const resolve: Array<() => void> = [];
  f.fetch.mockImplementation(() => new Promise<boolean>((done) => resolve.push(() => done(true))));
  await act(async () => {
    f.browserStore.getState().setBasePairDetail({ maxVisibleBases: 100 });
  });
  expect(resolve).toHaveLength(2);
  await act(async () => {
    f.browserStore.getState().setBasePairDetail({ maxVisibleBases: 50 });
  });
  await act(async () => resolve.forEach((done) => done()));
  expectDetails(["signal", "signal"]);
  expect(f.browserStore.getState().isLoading).toBe(false);
});
it("validates initial settings and rejects invalid updates without changing the cutoff", () => {
  const f = fixture();
  expect(f.browserStore.getState().basePairDetail).toEqual({ maxVisibleBases: 100 });
  for (const maxVisibleBases of [0, -1, 1.5, Infinity, NaN]) {
    expect(f.browserStore.getState().setBasePairDetail({ maxVisibleBases })).toMatchObject({
      ok: false,
      code: "INVALID_BASE_PAIR_DETAIL",
    });
    expect(f.browserStore.getState().basePairDetail.maxVisibleBases).toBe(100);
    expect(() =>
      createBrowserStore({
        assembly: f.browserStore.getState().assembly,
        region: f.browserStore.getState().region,
        basePairDetail: { maxVisibleBases },
      }),
    ).toThrow();
  }
});
