// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  GenomeBrowser,
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
  type TrackFetchContext,
} from "../../src/lib";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
const mounted: { root: Root; container: HTMLDivElement }[] = [];
afterEach(async () => {
  for (const { root, container } of mounted.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
  vi.useRealTimers();
});

async function mount({ end = 10_000, start = 1_000, ids = ["a", "b"] } = {}) {
  const requests: {
    context: TrackFetchContext<Record<string, never>>;
    resolve: (value: string) => void;
    reject: (error: Error) => void;
  }[] = [];
  const fetch = (context: TrackFetchContext<Record<string, never>>) =>
    new Promise<string>((resolve, reject) => requests.push({ context, resolve, reject }));
  const render = {
    full: ({ id, data }: { id: string; data: string }) => <text data-testid={id}>{data}</text>,
  };
  const module = defineTrackModule({
    type: "lifecycle",
    configSchema: z.object({}),
    fetch,
    render: { ...render, dense: render.full },
  });
  const other = defineTrackModule({ type: "other", configSchema: z.object({}), fetch, render });
  const track = (id: string) => module.create({ base: { id, title: id }, config: {} });
  const useTrackStore = createTrackStore({ modules: [module, other], tracks: ids.map(track) });
  const useBrowserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: end } },
    region: { chromosome: "chr1", start, end: start + 1_000 },
    trackWidth: 1_000,
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  await act(async () =>
    root.render(
      <GenomeBrowser sizing="fixed" browserStore={useBrowserStore} trackStore={useTrackStore} />,
    ),
  );
  const latest = (id = "a") => {
    const request = requests.findLast((request) => request.context.track.base.id === id);
    if (!request) throw new Error(`No request for ${id}`);
    return request;
  };
  return {
    container,
    root,
    requests,
    latest,
    useTrackStore,
    useBrowserStore,
    track,
    other,
    text: (id = "a") => container.querySelector(`[data-testid="${id}"]`)?.textContent,
    resolve: async (id = "a", value = id) => {
      await act(async () => latest(id).resolve(value));
    },
    pan: async (start: number) => {
      await act(async () =>
        useBrowserStore.getState().setRegion({ chromosome: "chr1", start, end: start + 1_000 }),
      );
    },
  };
}

describe("browser data lifecycle", () => {
  it("displays independent results as they arrive and finishes loading after the last track", async () => {
    const t = await mount();
    expect(t.requests).toHaveLength(2);
    expect(t.latest().context.demand).toMatchObject({
      region: { chromosome: "chr1", start: 0, end: 3_000 },
      visibleRegion: { chromosome: "chr1", start: 1_000, end: 2_000 },
      width: 3_000,
    });
    expect(t.useBrowserStore.getState().isLoading).toBe(true);
    await t.resolve();
    expect(t.text()).toBe("a");
    expect(t.text("b")).toBeUndefined();
    expect(t.useBrowserStore.getState().isLoading).toBe(true);
    await t.resolve("b");
    expect(t.text("b")).toBe("b");
    expect(t.text()).toBe("a");
    expect(t.useBrowserStore.getState().isLoading).toBe(false);
  });

  it("reuses the loaded margin, then refreshes before its edge while retaining visible data", async () => {
    const t = await mount({ ids: ["a"] });
    await t.resolve();
    await t.pan(1_200);
    expect(t.requests).toHaveLength(1);
    expect(t.useBrowserStore.getState().isLoading).toBe(false);
    await act(async () => {
      t.useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 1_600, end: 2_600 });
      expect(t.useBrowserStore.getState().isLoading).toBe(true);
    });
    expect(t.latest().context.demand.region).toEqual({
      chromosome: "chr1",
      start: 600,
      end: 3_600,
    });
    expect(t.text()).toBe("a");
    await t.resolve("a", "refreshed");
    expect(t.text()).toBe("refreshed");
    expect(t.requests).toHaveLength(2);
  });

  it("reuses data during repeated pans at a chromosome end", async () => {
    const t = await mount({ ids: ["a"], end: 3_000, start: 2_000 });
    await t.resolve();
    for (const start of [1_900, 1_950, 2_000]) await t.pan(start);
    expect(t.requests).toHaveLength(1);
    expect(t.text()).toBe("a");
    expect(t.useBrowserStore.getState().isLoading).toBe(false);
  });

  it("refetches a zoom when chromosome clipping keeps the fetched region unchanged", async () => {
    const t = await mount({ ids: ["a"], end: 1_000, start: 0 });
    const first = t.latest().context.demand;
    await t.resolve();
    await act(async () =>
      t.useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 0, end: 500 }),
    );
    expect(t.requests).toHaveLength(2);
    expect(t.latest().context.demand.region).toEqual(first.region);
    expect(t.latest().context.demand.visibleRegion).toEqual({
      chromosome: "chr1",
      start: 0,
      end: 500,
    });
    expect(t.text()).toBeUndefined();
    await t.resolve("a", "zoomed");
    expect(t.text()).toBe("zoomed");
  });

  it.each(["resolve", "reject"] as const)(
    "aborts a superseded fetch and ignores its late %s",
    async (outcome) => {
      const t = await mount({ ids: ["a"] });
      await t.resolve();
      await t.pan(5_000);
      const stale = t.latest();
      await t.pan(8_000);
      expect(stale.context.signal?.aborted).toBe(true);
      expect(t.latest().context.signal?.aborted).toBe(false);
      await act(async () =>
        outcome === "resolve" ? stale.resolve("stale") : stale.reject(new Error("stale failure")),
      );
      expect(t.text()).toBe("a");
      expect(t.useBrowserStore.getState().isLoading).toBe(true);
      await t.resolve("a", "current");
      expect(t.text()).toBe("current");
      expect(t.container.textContent).not.toContain("stale failure");
      expect(t.useBrowserStore.getState().isLoading).toBe(false);
    },
  );

  it("shows escaped fetch errors and recovers on the next demand change", async () => {
    const t = await mount();
    const message = "<script>bad</script> " + "long details ".repeat(100);
    await act(async () => t.latest().reject(new Error(message)));
    await t.resolve("b");
    expect(t.container.querySelector('[role="region"]')?.textContent).toContain(message);
    expect(t.container.querySelector("script")).toBeNull();
    expect(t.container.querySelector('[role="region"]')?.getAttribute("tabindex")).toBe("0");
    expect(t.container.querySelector("dialog")).toBeNull();
    expect(t.text("b")).toBe("b");
    expect(t.useBrowserStore.getState().isLoading).toBe(false);
    await t.pan(1_100);
    expect(t.requests).toHaveLength(3);
    await t.resolve("a", "recovered");
    expect(t.text()).toBe("recovered");
    expect(t.container.textContent).not.toContain(message);
    expect(t.useBrowserStore.getState().isLoading).toBe(false);
  });

  it("debounces width changes, retains displayed data, and fetches the final resolution", async () => {
    vi.useFakeTimers();
    const t = await mount({ ids: ["a"] });
    await t.resolve();
    for (const width of [1_500, 2_000])
      await act(async () => t.useBrowserStore.getState().setTrackWidth(width));
    expect(t.requests).toHaveLength(1);
    expect(t.text()).toBe("a");
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(t.requests).toHaveLength(2);
    expect(t.latest().context.demand.width).toBe(6_000);
    await t.resolve("a", "wide");
    expect(t.text()).toBe("wide");
  });

  it("combines a pending resize and navigation into one request at the new resolution", async () => {
    vi.useFakeTimers();
    const t = await mount({ ids: ["a"] });
    await t.resolve();
    await act(async () => t.useBrowserStore.getState().setTrackWidth(2_000));
    await t.pan(5_000);
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(t.requests).toHaveLength(2);
    expect(t.latest().context.demand.width).toBe(6_000);
    await t.resolve("a", "wide navigation");
    expect(t.text()).toBe("wide navigation");
  });

  it("refreshes for a display change and a remount with another assembly", async () => {
    const t = await mount({ ids: ["a"] });
    await t.resolve();
    await act(async () =>
      t.useTrackStore.getState().updateTrack("a", { base: { display: "dense" } }),
    );
    expect(t.latest().context.track.base.display).toBe("dense");
    expect(t.text()).toBeUndefined();
    await t.resolve("a", "dense result");
    expect(t.text()).toBe("dense result");
    const useBrowserStore = createBrowserStore({
      assembly: { id: "other", chromosomes: { chr1: 10_000 } },
      region: { chromosome: "chr1", start: 1_000, end: 2_000 },
      trackWidth: 1_000,
    });
    await act(async () =>
      t.root.render(
        <GenomeBrowser
          key="other-assembly"
          sizing="fixed"
          browserStore={useBrowserStore}
          trackStore={t.useTrackStore}
        />,
      ),
    );
    expect(t.latest().context.demand.assembly.id).toBe("other");
    await t.resolve("a", "other assembly");
    expect(t.text()).toBe("other assembly");
  });

  it("scopes reusable resources to a track and mounted browser", async () => {
    const first = await mount();
    const second = await mount({ ids: ["a"] });
    const resources = first.latest().context.resources;
    const reader = { name: "reader" };
    resources.set("reader", reader);
    expect(first.latest("b").context.resources.get("reader")).toBeUndefined();
    expect(second.latest().context.resources.get("reader")).toBeUndefined();
    await first.resolve();
    await first.resolve("b");
    await first.pan(5_000);
    expect(first.latest().context.resources.get("reader")).toBe(reader);
    await first.resolve("a", "reused reader");
    expect(first.text()).toBe("reused reader");
    resources.delete("reader");
    expect(first.latest().context.resources.get("reader")).toBeUndefined();
    resources.set("a", 1);
    resources.set("b", 2);
    resources.clear();
    expect(resources.get("a")).toBeUndefined();
    expect(resources.get("b")).toBeUndefined();
  });

  it("reuses resources for equivalent replacements but releases them when the module changes", async () => {
    const t = await mount({ ids: ["a"] });
    const resources = t.latest().context.resources;
    resources.set("reader", "original");
    await t.resolve();
    await act(async () => t.useTrackStore.getState().setTracks([t.track("a")]));
    expect(t.requests).toHaveLength(1);
    expect(t.text()).toBe("a");
    await t.pan(5_000);
    expect(t.latest().context.resources.get("reader")).toBe("original");
    const old = t.latest();
    await act(async () =>
      t.useTrackStore
        .getState()
        .setTracks([t.other.create({ base: { id: "a", title: "Other" }, config: {} })]),
    );
    expect(old.context.signal?.aborted).toBe(true);
    expect(t.latest().context.track.type).toBe("other");
    expect(t.latest().context.resources.get("reader")).toBeUndefined();
    expect(resources.get("reader")).toBeUndefined();
    await t.resolve("a", "other module");
    expect(t.text()).toBe("other module");
  });

  it("aborts removed tracks, discards late results, and starts fresh when the ID returns", async () => {
    const t = await mount();
    const removed = t.latest();
    removed.context.resources.set("reader", "old");
    await t.resolve("b");
    await act(async () => t.useTrackStore.getState().removeTrack("a"));
    expect(removed.context.signal?.aborted).toBe(true);
    expect(removed.context.resources.get("reader")).toBeUndefined();
    expect(t.useBrowserStore.getState().isLoading).toBe(false);
    await act(async () => t.useTrackStore.getState().setTracks([t.track("a"), t.track("b")]));
    expect(t.latest().context.resources.get("reader")).toBeUndefined();
    await act(async () => removed.resolve("stale"));
    expect(t.text()).toBeUndefined();
    expect(t.text("b")).toBe("b");
    await t.resolve("a", "new instance");
    expect(t.text()).toBe("new instance");
  });

  it("aborts pending work and releases retained resources on unmount", async () => {
    const t = await mount({ ids: ["a"] });
    const pending = t.latest();
    pending.context.resources.set("reader", "cached");
    await act(async () => t.root.render(null));
    expect(pending.context.signal?.aborted).toBe(true);
    expect(pending.context.resources.get("reader")).toBeUndefined();
    expect(t.useBrowserStore.getState().isLoading).toBe(false);
    await act(async () => pending.resolve("late"));
    expect(t.container.textContent).toBe("");
  });
});
