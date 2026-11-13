// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  GenomeBrowser,
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
  fetchOnChange,
} from "../../src/lib";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";

function Signal({ data, color }: { data: number; color: string }) {
  return <rect data-signal={data} width={20} height={20} fill={color} />;
}
const fetch = vi.fn(
  async ({ track }: { track: { config: { value: number } }; signal?: AbortSignal }) =>
    track.config.value,
);
const module = defineTrackModule({
  type: "test-signal",
  configSchema: z.object({ value: fetchOnChange(z.number()) }),
  fetch,
  render: { full: Signal, dense: Signal },
});
const tracks = ["one", "two", "three", "outside"].map((id, index) =>
  module.create({ base: { id, title: id, height: 20 }, config: { value: index + 1 } }),
);
let probe: Probe | undefined;
afterEach(() => {
  probe?.unmount();
  probe = undefined;
  fetch.mockClear();
});

it("owns set membership, atomic shared display updates, ordering and round trips", () => {
  const store = createTrackStore({ modules: [module], tracks });
  expect(
    store
      .getState()
      .createTrackSet({ id: "set", title: "Signals", trackIds: ["one", "two", "three"] }),
  ).toEqual({ ok: true });
  const original = store.getState().tracks;
  expect(
    store
      .getState()
      .addTrack(module.create({ base: { id: "set", title: "Collision" }, config: { value: 5 } })),
  ).toMatchObject({ ok: false, code: "INVALID_TRACK_SET" });
  expect(store.getState().tracks).toEqual(original);
  expect(
    store.getState().createTrackSet({ id: "other", title: "Other", trackIds: ["one"] }).ok,
  ).toBe(false);
  expect(store.getState().updateTrackSetDisplay("set", "pack").ok).toBe(false);
  expect(store.getState().tracks).toEqual(original);
  expect(store.getState().updateTrackSetDisplay("set", "dense")).toEqual({ ok: true });
  expect(store.getState().tracks.map((t) => t.base.display)).toEqual([
    "dense",
    "dense",
    "dense",
    "full",
  ]);
  store.getState().setTrackVisibility("two", false);
  store.getState().updateTrackSet("set", { visible: false });
  const saved = JSON.parse(
    JSON.stringify({
      tracks: store.getState().tracks,
      trackSets: store.getState().trackSets,
      hiddenTrackIds: store.getState().hiddenTrackIds,
    }),
  );
  const restored = createTrackStore({ modules: [module], ...saved });
  expect(restored.getState().trackSets).toEqual([
    { id: "set", title: "Signals", trackIds: ["one", "two", "three"], visible: false },
  ]);
  expect(restored.getState().hiddenTrackIds).toEqual(["two"]);
  expect(restored.getState().moveTrackSet("set", "down")).toEqual({ ok: true });
  expect(restored.getState().order).toEqual(["outside", "one", "two", "three"]);
  expect(restored.getState().ungroupTrackSet("set")).toEqual({ ok: true });
  expect(restored.getState().tracks.map((t) => t.base.display)).toEqual([
    "full",
    "dense",
    "dense",
    "dense",
  ]);
  expect(restored.getState().hiddenTrackIds).toEqual(["two"]);
});

it("hides set children from layout and fetch demand without destroying their settings or cached results", async () => {
  const useTrackStore = createTrackStore({
    modules: [module],
    tracks,
    trackSets: [{ id: "set", title: "Signals", trackIds: ["one", "two", "three"], visible: false }],
  });
  const useBrowserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 1000, end: 2000 },
    trackWidth: 800,
  });
  probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={useBrowserStore} trackStore={useTrackStore} />,
  );
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(document.querySelectorAll("[data-track-id]")).toHaveLength(1);
  expect(document.querySelector('[data-track-set-id="set"]')).not.toBeNull();
  await probe.measure(() => useTrackStore.getState().updateTrackSet("set", { visible: true }));
  expect(fetch).toHaveBeenCalledTimes(4);
  expect(document.querySelectorAll("[data-track-id]")).toHaveLength(4);
  const renamed = await probe.measure(() =>
    useTrackStore.getState().updateTrackSet("set", { title: "Renamed signals" }),
  );
  expect(renamed.pick("BrowserCanvas", "TrackStack", "TrackRow", "Signal", "TrackSetHeader"))
    .toMatchInlineSnapshot(`
    {
      "BrowserCanvas": 0,
      "Signal": 0,
      "TrackRow": 0,
      "TrackSetHeader": 1,
      "TrackStack": 0,
    }
  `);
  await probe.measure(() => useTrackStore.getState().setTrackVisibility("two", false));
  expect(document.querySelector('[data-track-id="two"]')).toBeNull();
  expect(useTrackStore.getState().getTrack("two")!.config).toEqual({ value: 2 });
  await probe.measure(() => useTrackStore.getState().updateTrackSet("set", { visible: false }));
  await probe.measure(() => useTrackStore.getState().updateTrackSet("set", { visible: true }));
  expect(fetch).toHaveBeenCalledTimes(4);
  expect(document.querySelectorAll("[data-track-id]")).toHaveLength(3);
  await probe.measure(() => useTrackStore.getState().ungroupTrackSet("set"));
  expect(document.querySelector('[data-track-set-id="set"]')).toBeNull();
  expect(document.querySelectorAll("[data-track-id]")).toHaveLength(3);
});

it("cancels hidden children and ignores a late response while preserving healthy siblings", async () => {
  let finish!: (data: number) => void;
  let signal: AbortSignal | undefined;
  fetch.mockImplementationOnce((context) => {
    signal = context.signal;
    return new Promise<number>((resolve) => {
      finish = resolve;
    });
  });
  const useTrackStore = createTrackStore({
    modules: [module],
    tracks: tracks.slice(0, 3),
    trackSets: [{ id: "set", title: "Signals", trackIds: ["one", "two", "three"] }],
  });
  const useBrowserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 1000, end: 2000 },
    trackWidth: 800,
  });
  probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={useBrowserStore} trackStore={useTrackStore} />,
  );
  expect(useBrowserStore.getState().isLoading).toBe(true);
  await probe.measure(() =>
    document
      .querySelector<SVGGElement>('[aria-label="Hide track set Signals"]')!
      .dispatchEvent(new MouseEvent("click", { bubbles: true })),
  );
  expect(signal?.aborted).toBe(true);
  expect(useBrowserStore.getState().isLoading).toBe(false);
  await probe.measure(() => finish(999));
  await probe.measure(() => useTrackStore.getState().updateTrackSet("set", { visible: true }));
  expect(fetch).toHaveBeenCalledTimes(4);
  expect(document.querySelector('[data-signal="999"]')).toBeNull();
  expect(document.querySelector('[data-signal="1"]')).not.toBeNull();
});

it("previews and commits membership drags without refetching, and cancels stale or interrupted gestures", async () => {
  const useTrackStore = createTrackStore({
    modules: [module],
    tracks,
    trackSets: [{ id: "set", title: "Signals", trackIds: ["one", "two", "three"] }],
  });
  const useBrowserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 1000, end: 2000 },
    trackWidth: 800,
  });
  probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={useBrowserStore} trackStore={useTrackStore} />,
  );
  const svg = document.querySelector('svg[aria-label="Genome browser"]')!;
  const point = {
    x: 0,
    y: 0,
    matrixTransform() {
      return { x: this.x, y: this.y };
    },
  };
  Object.assign(svg, {
    createSVGPoint: () => point,
    getScreenCTM: () => ({ inverse: () => ({}) }),
  });
  const pointer = (type: string, y: number, target: EventTarget = document) => {
    const event = new MouseEvent(type, {
      clientX: 20,
      clientY: y,
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    Object.defineProperties(event, { pointerId: { value: 1 }, isPrimary: { value: true } });
    target.dispatchEvent(event);
  };
  const y = (id: string) =>
    Number(
      document
        .querySelector(`[data-track-id="${id}"]`)!
        .getAttribute("transform")!
        .match(/translate\(0,([^\)]+)\)/)![1],
    );
  const start = () =>
    pointer(
      "pointerdown",
      y("outside") + 10,
      document.querySelector('[data-track-drag-handle="outside"]')!,
    );
  await probe.measure(start);
  const preview = await probe.measure(() => pointer("pointermove", y("two") + 1));
  expect(preview.pick("BrowserCanvas", "TrackStack", "TrackRow", "Signal", "TrackSetDragOverlay"))
    .toMatchInlineSnapshot(`
   {
     "BrowserCanvas": 0,
     "Signal": 0,
     "TrackRow": 0,
     "TrackSetDragOverlay": 1,
     "TrackStack": 0,
   }
 `);
  expect(document.querySelector('[data-track-drop-preview][data-drop-set="set"]')).not.toBeNull();
  expect(useTrackStore.getState().order).toEqual(["one", "two", "three", "outside"]);
  await probe.measure(() => pointer("pointerup", y("two") + 1));
  expect(useTrackStore.getState().order).toEqual(["one", "outside", "two", "three"]);
  expect(useTrackStore.getState().trackSets[0].trackIds).toContain("outside");
  expect(fetch).toHaveBeenCalledTimes(4);
  const bottom = Number(svg.getAttribute("viewBox")!.split(" ")[3]) + 10;
  await probe.measure(start);
  await probe.measure(() => pointer("pointermove", bottom));
  await probe.measure(() => pointer("pointerup", bottom));
  expect(useTrackStore.getState().order).toEqual(["one", "two", "three", "outside"]);
  expect(useTrackStore.getState().trackSets[0].trackIds).not.toContain("outside");
  await probe.measure(start);
  await probe.measure(() => pointer("pointermove", 16));
  await probe.measure(() =>
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
  );
  await probe.measure(() => pointer("pointerup", 16));
  expect(useTrackStore.getState().trackSets[0].trackIds).not.toContain("outside");
  expect(document.querySelector("[data-track-drop-preview]")).toBeNull();
  await probe.measure(start);
  await probe.measure(() => pointer("pointermove", 16));
  await probe.measure(() => useTrackStore.getState().updateTrackSet("set", { visible: false }));
  await probe.measure(() => pointer("pointerup", 16));
  expect(useTrackStore.getState().trackSets[0].trackIds).not.toContain("outside");
  await probe.measure(start);
  await probe.measure(() => pointer("pointermove", 16));
  await probe.measure(() => pointer("pointerup", 16));
  expect(useTrackStore.getState().trackSets[0].trackIds).toContain("outside");
  expect(document.querySelector('[data-track-id="outside"]')).toBeNull();
  await probe.measure(() => useTrackStore.getState().updateTrackSet("set", { visible: true }));
  const handle = document.querySelector<SVGElement>('[data-track-drag-handle="outside"]')!;
  await probe.measure(() => {
    handle.focus();
    handle.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  const remove = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find(
    (button) => button.textContent === "Remove from group",
  )!;
  await probe.measure(() => remove.click());
  expect(useTrackStore.getState().trackSets[0].trackIds).not.toContain("outside");
  expect(document.querySelector('[data-signal="4"]')).not.toBeNull();
  expect(fetch).toHaveBeenCalledTimes(4);
});
