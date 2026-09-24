import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  createTrackDataController,
  type TrackDataController,
} from "../../src/browser/data/trackDataController";
import { createTrackResourceStore } from "../../src/browser/data/trackResourceStore";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { createTrackStore } from "../../src/browser/state/trackStore";
import type { GenomicRegion } from "../../src/genome/region";
import { defineTrackModule } from "../../src/modules/defineTrackModule";
import { fetchOnChange } from "../../src/modules/fetchOnChange";
import type { TrackFetchContext } from "../../src/modules/types";

type Config = { url: string; label: string };
type Request = {
  context: TrackFetchContext<Config>;
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
};

let requests: Request[] = [];
let browserStore: ReturnType<typeof createBrowserStore> | undefined;
let disconnect: (() => void) | undefined;

afterEach(() => {
  disconnect?.();
  disconnect = undefined;
  requests = [];
  vi.useRealTimers();
});

const fetch = vi.fn(
  (context: TrackFetchContext<Config>) =>
    new Promise<unknown>((resolve, reject) => {
      requests.push({ context, resolve, reject });
    }),
);

const module = defineTrackModule({
  type: "controller-test",
  configSchema: z.object({ url: fetchOnChange(z.string()), label: z.string() }),
  fetch,
  render: { full: () => null, dense: () => null },
});

const otherModule = defineTrackModule({
  type: "controller-other-test",
  configSchema: z.object({ url: fetchOnChange(z.string()), label: z.string() }),
  fetch,
  render: { full: () => null },
});

function createTrack(id: string, config: Partial<Config> = {}) {
  return module.create({
    base: { id, title: id },
    config: { url: id, label: id, ...config },
  });
}

/** Mounts a controller on a 1000px track where one pixel is one base. */
function setup({
  trackIds = ["a", "b"],
  region = { chromosome: "chr1", start: 1_000, end: 2_000 },
  chromosomeLength = 10_000,
  widthDebounceMs = 200,
  resourceStore = createTrackResourceStore(),
}: {
  trackIds?: string[];
  region?: GenomicRegion;
  chromosomeLength?: number;
  widthDebounceMs?: number;
  resourceStore?: ReturnType<typeof createTrackResourceStore>;
} = {}) {
  fetch.mockClear();
  browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: chromosomeLength } },
    region,
    trackWidth: 1_000,
  });
  const trackStore = createTrackStore({
    modules: [module, otherModule],
    tracks: trackIds.map((id) => createTrack(id)),
  });
  const controller = createTrackDataController({
    browserStore,
    trackStore,
    trackWidth: 1_000,
    widthDebounceMs,
    resourceStore,
  });
  const listener = vi.fn();
  controller.subscribe(listener);
  disconnect = controller.connect();
  return { browserStore, trackStore, controller, listener, resourceStore };
}

function isLoading() {
  return browserStore?.getState().isLoading;
}

function lastRequest(trackId: string) {
  const request = requests.findLast((entry) => entry.context.track.base.id === trackId);
  if (!request) throw new Error(`No request for ${trackId}`);
  return request;
}

async function resolve(trackId: string, data: unknown = trackId) {
  lastRequest(trackId).resolve(data);
  await flush();
}

async function resolveAll() {
  for (const request of requests) request.resolve(request.context.track.base.id);
  await flush();
}

async function flush() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

function data(controller: TrackDataController, trackId: string) {
  const state = controller.getTrack(trackId);
  return state.status === "ready" ? state.data : state.status;
}

describe("track data controller", () => {
  it("fetches the pre-loaded window for every track and shows each result as it arrives", async () => {
    const { controller } = setup();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(lastRequest("a").context.demand).toMatchObject({
      region: { chromosome: "chr1", start: 0, end: 3_000 },
      width: 3_000,
    });
    expect(isLoading()).toBe(true);

    await resolve("a");
    const b = controller.getTrack("b");
    expect(data(controller, "a")).toBe("a");
    expect(b).toEqual({ status: "loading" });
    expect(isLoading()).toBe(true);

    await resolve("b");
    expect(data(controller, "b")).toBe("b");
    expect(isLoading()).toBe(false);
  });

  it("keeps one track's state identity when another track's result arrives", async () => {
    const { controller, browserStore } = setup();
    await resolveAll();
    const a = controller.getTrack("a");

    browserStore.getState().setRegion({ chromosome: "chr1", start: 5_000, end: 6_000 });
    const b = controller.getTrack("b");
    await resolve("b", "b2");

    expect(data(controller, "b")).toBe("b2");
    expect(controller.getTrack("b")).not.toBe(b);
    expect(controller.getTrack("a")).toBe(a);
  });

  it("sets the browser store's isLoading in the update that commits a region needing data", async () => {
    const { browserStore } = setup();
    await resolveAll();
    const seen: boolean[] = [];
    browserStore.subscribe((state) => seen.push(state.isLoading));

    browserStore.getState().setRegion({ chromosome: "chr1", start: 5_000, end: 6_000 });

    expect(isLoading()).toBe(true);
    expect(seen).toContain(true);
  });

  it("does not fetch for a pan inside the pre-loaded margin", async () => {
    const { controller, browserStore } = setup();
    await resolveAll();
    const a = controller.getTrack("a");

    // Data covers 0-3000; 1200-2200 leaves at least half a span beyond each edge.
    browserStore.getState().setRegion({ chromosome: "chr1", start: 1_200, end: 2_200 });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(isLoading()).toBe(false);
    expect(controller.getTrack("a")).toBe(a);
  });

  it("refetches before the edge of the data reaches the view, keeping old data meanwhile", async () => {
    const { controller, browserStore } = setup();
    await resolveAll();

    // Only 400 bases remain beyond the right edge, less than half the 1000-base span.
    browserStore.getState().setRegion({ chromosome: "chr1", start: 1_600, end: 2_600 });

    expect(fetch).toHaveBeenCalledTimes(4);
    expect(lastRequest("a").context.demand.region).toEqual({
      chromosome: "chr1",
      start: 600,
      end: 3_600,
    });
    expect(isLoading()).toBe(true);
    expect(data(controller, "a")).toBe("a");
  });

  it("does not refetch for repeated pans at a chromosome end", async () => {
    const { browserStore } = setup({
      region: { chromosome: "chr1", start: 2_000, end: 3_000 },
      chromosomeLength: 3_000,
    });
    await resolveAll();
    expect(lastRequest("a").context.demand.region).toEqual({
      chromosome: "chr1",
      start: 1_000,
      end: 3_000,
    });

    browserStore.getState().setRegion({ chromosome: "chr1", start: 1_900, end: 2_900 });
    browserStore.getState().setRegion({ chromosome: "chr1", start: 1_950, end: 2_950 });
    browserStore.getState().setRegion({ chromosome: "chr1", start: 2_000, end: 3_000 });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(isLoading()).toBe(false);
  });

  it("hides old data across a zoom", async () => {
    const { controller, browserStore } = setup();
    await resolveAll();

    browserStore.getState().setRegion({ chromosome: "chr1", start: 1_000, end: 1_500 });

    expect(controller.getTrack("a")).toEqual({ status: "loading" });
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("aborts a superseded request and ignores its late result", async () => {
    const { controller, browserStore } = setup({ trackIds: ["a"] });
    await resolveAll();

    browserStore.getState().setRegion({ chromosome: "chr1", start: 5_000, end: 6_000 });
    const superseded = lastRequest("a");
    browserStore.getState().setRegion({ chromosome: "chr1", start: 8_000, end: 9_000 });

    expect(superseded.context.signal?.aborted).toBe(true);
    expect(lastRequest("a").context.signal?.aborted).toBe(false);
    superseded.resolve("stale");
    await flush();
    // The first result stays on screen until the current request finishes.
    expect(data(controller, "a")).toBe("a");
    expect(isLoading()).toBe(true);

    await resolve("a", "current");
    expect(data(controller, "a")).toBe("current");
    expect(isLoading()).toBe(false);
  });

  it("refetches once after a resize settles and keeps old data until then", async () => {
    vi.useFakeTimers();
    const { controller } = setup({ trackIds: ["a"] });
    await resolveAll();
    const a = controller.getTrack("a");

    controller.setTrackWidth(1_500);
    controller.setTrackWidth(2_000);
    await vi.advanceTimersByTimeAsync(199);
    expect(fetch).toHaveBeenCalledOnce();
    expect(controller.getTrack("a")).toBe(a);

    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(lastRequest("a").context.demand.width).toBe(6_000);
    expect(controller.getTrack("a")).toBe(a);

    await resolve("a", "wide");
    expect(data(controller, "a")).toBe("wide");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("joins a pending width change to a region change as one request", async () => {
    vi.useFakeTimers();
    const { controller, browserStore } = setup({ trackIds: ["a"] });
    await resolveAll();

    controller.setTrackWidth(2_000);
    browserStore.getState().setRegion({ chromosome: "chr1", start: 5_000, end: 6_000 });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(lastRequest("a").context.demand.width).toBe(6_000);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("settles on an error and retries on the next demand change", async () => {
    const { controller, browserStore } = setup({ trackIds: ["a"] });
    lastRequest("a").reject(new Error("unreachable"));
    await flush();

    expect(controller.getTrack("a")).toMatchObject({ status: "error", error: "unreachable" });
    expect(isLoading()).toBe(false);

    // A small pan would stay inside the margin for ready data; errors always retry.
    browserStore.getState().setRegion({ chromosome: "chr1", start: 1_100, end: 2_100 });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(isLoading()).toBe(true);
  });

  it("refetches only when a track's fetch signature changes", async () => {
    const { controller, trackStore } = setup({ trackIds: ["a"] });
    await resolveAll();
    const a = controller.getTrack("a");

    trackStore.getState().updateTrack("a", { base: { color: "#123456", title: "Renamed" } });
    trackStore.getState().updateTrack("a", { config: { label: "Relabeled" } });
    expect(fetch).toHaveBeenCalledOnce();
    expect(controller.getTrack("a")).toBe(a);

    trackStore.getState().updateTrack("a", { config: { url: "changed" } });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(lastRequest("a").context.track.config.url).toBe("changed");
    expect(controller.getTrack("a")).toEqual({ status: "loading" });
  });

  it("refetches when the display or assembly changes", async () => {
    const { trackStore, browserStore } = setup({ trackIds: ["a"] });
    await resolveAll();

    trackStore.getState().updateTrack("a", { base: { display: "dense" } });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(lastRequest("a").context.track.base.display).toBe("dense");
    await resolveAll();

    browserStore.setState({ assembly: { id: "other", chromosomes: { chr1: 10_000 } } });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(lastRequest("a").context.demand.assembly.id).toBe("other");
  });

  it("refetches a same-ID replacement from another module", async () => {
    const { trackStore } = setup({ trackIds: ["a"] });
    await resolveAll();

    trackStore
      .getState()
      .setTracks([
        otherModule.create({ base: { id: "a", title: "a" }, config: { url: "a", label: "a" } }),
      ]);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(lastRequest("a").context.track.type).toBe("controller-other-test");
  });

  it("aborts, prunes, and releases resources for a removed track", async () => {
    const { controller, trackStore, resourceStore } = setup();
    await resolveAll();
    resourceStore.resourcesFor({ type: module.type, id: "b" }).set("reader", "cached");
    trackStore.getState().updateTrack("b", { config: { url: "changed" } });
    const pending = lastRequest("b");

    trackStore.getState().removeTrack("b");

    expect(pending.context.signal?.aborted).toBe(true);
    expect(isLoading()).toBe(false);
    expect(controller.getTrack("b")).toEqual({ status: "loading" });
    expect(resourceStore.resourcesFor({ type: module.type, id: "b" }).get("reader")).toBe(
      undefined,
    );
  });

  it("aborts requests and releases resources when disconnected", async () => {
    const { resourceStore } = setup({ trackIds: ["a"] });
    resourceStore.resourcesFor({ type: module.type, id: "a" }).set("reader", "cached");
    const pending = lastRequest("a");

    disconnect?.();
    disconnect = undefined;

    expect(pending.context.signal?.aborted).toBe(true);
    expect(isLoading()).toBe(false);
    expect(resourceStore.resourcesFor({ type: module.type, id: "a" }).get("reader")).toBe(
      undefined,
    );
  });

  it("gives each track its own resource scope", async () => {
    setup();
    lastRequest("a").context.resources.set("reader", "a-reader");

    expect(lastRequest("b").context.resources.get("reader")).toBe(undefined);
    expect(lastRequest("a").context.resources.get("reader")).toBe("a-reader");
  });
});
