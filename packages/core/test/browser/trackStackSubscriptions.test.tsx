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

const { trackFrameRenderCounts } = vi.hoisted(() => ({
  trackFrameRenderCounts: new Map<string, number>(),
}));

vi.mock("../../src/browser/track-row/TrackControls", () => ({
  TrackControls: ({ track }: { track: { base: { id: string } } }) => {
    const id = track.base.id;
    trackFrameRenderCounts.set(id, (trackFrameRenderCounts.get(id) ?? 0) + 1);
    return <g data-track-controls={id} />;
  },
}));

const rendererRenderCounts = new Map<string, number>();

function Renderer({ id, color }: { id: string; color: string }) {
  rendererRenderCounts.set(id, (rendererRenderCounts.get(id) ?? 0) + 1);
  return <rect data-track-renderer={id} fill={color} />;
}

const module = defineTrackModule({
  type: "track-stack-subscription-test",
  configSchema: z.object({}),
  fetch: async () => null,
  render: { full: Renderer },
});

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  trackFrameRenderCounts.clear();
  rendererRenderCounts.clear();
});

describe("TrackStack subscriptions", () => {
  it("renders updated pin order and disables dragging only for pinned rows", async () => {
    const useTrackStore = createStore();
    useTrackStore.getState().setPinnedTrackIds(["second"]);
    await renderBrowser(useTrackStore);
    expect(renderedIds()).toEqual(["second", "first"]);
    expect(trackRow("second").getAttribute("transform")).toBe("translate(0,0)");
    expect(trackRow("second").querySelector('rect[style*="cursor: default"]')).not.toBeNull();
    expect(trackRow("first").querySelector('rect[style*="cursor: grab"]')).not.toBeNull();

    await mutate(() => {
      useTrackStore.getState().setPinnedTrackIds(["first", "second"]);
    });
    expect(renderedIds()).toEqual(["first", "second"]);
    await mutate(() => {
      useTrackStore.getState().reorderTracks(["second", "first"]);
    });
    expect(renderedIds()).toEqual(["first", "second"]);
    await mutate(() => {
      useTrackStore.getState().setPinnedTrackIds([]);
    });
    expect(trackRow("first").querySelector('rect[style*="cursor: grab"]')).not.toBeNull();
    expect(trackRow("second").querySelector('rect[style*="cursor: grab"]')).not.toBeNull();
  });

  it("keeps drag previews and drops below pins and ignores a stale drag after pin changes", async () => {
    const useTrackStore = createStore();
    useTrackStore.getState().addTrack(createTrack("third", 20));
    useTrackStore.getState().setPinnedTrackIds(["first"]);
    await renderBrowser(useTrackStore);
    const point = { x: 0, y: 0, matrixTransform: () => ({ x: point.x, y: point.y }) };
    Object.assign(browserSvg(), {
      createSVGPoint: () => point,
      getScreenCTM: () => ({ inverse: () => ({}) }),
    });
    const startDrag = async (id: string) => {
      const handle = trackRow(id).querySelector('rect[style*="cursor: grab"]');
      if (!handle) throw new Error("Drag handle not found");
      await mutate(() => {
        handle.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientY: 200 }));
      });
    };
    const move = () => document.dispatchEvent(new MouseEvent("mousemove", { clientY: -200 }));
    const drop = () => document.dispatchEvent(new MouseEvent("mouseup", { clientY: -200 }));
    await startDrag("third");
    await mutate(move);
    expect(trackRow("first").getAttribute("transform")).toBe("translate(0,0)");
    await mutate(drop);
    expect(useTrackStore.getState().order).toEqual(["first", "third", "second"]);

    await startDrag("second");
    await mutate(move);
    await mutate(() => {
      useTrackStore.getState().setPinnedTrackIds(["second", "first"]);
    });
    await mutate(drop);
    expect(useTrackStore.getState().order).toEqual(["second", "first", "third"]);
    expect(renderedIds()).toEqual(["second", "first", "third"]);
  });

  it("rerenders only the addressed production row when its presentation changes", async () => {
    const useTrackStore = createStore();
    await renderBrowser(useTrackStore);
    trackFrameRenderCounts.clear();
    rendererRenderCounts.clear();

    await act(async () => {
      expect(useTrackStore.getState().updateTrack("first", { base: { color: "#123456" } })).toEqual(
        { ok: true },
      );
      await flushEffects();
    });

    expect(trackFrameRenderCounts.get("first")).toBe(1);
    expect(trackFrameRenderCounts.get("second")).toBeUndefined();
    expect(rendererRenderCounts.get("first")).toBe(1);
    expect(rendererRenderCounts.get("second")).toBeUndefined();
    expect(rowRenderer("first").getAttribute("fill")).toBe("#123456");
  });

  it("updates total height, row positions, membership, replacement, and order", async () => {
    const useTrackStore = createStore();
    await renderBrowser(useTrackStore);

    expect(browserSvg().getAttribute("viewBox")).toBe("0 0 1100 80");
    expect(trackRow("second").getAttribute("transform")).toBe("translate(0,35)");

    await mutate(() =>
      expect(useTrackStore.getState().updateTrack("first", { base: { height: 35 } })).toEqual({
        ok: true,
      }),
    );
    expect(browserSvg().getAttribute("viewBox")).toBe("0 0 1100 95");
    expect(trackRow("second").getAttribute("transform")).toBe("translate(0,50)");

    await mutate(() =>
      expect(useTrackStore.getState().addTrack(createTrack("third", 15))).toEqual({ ok: true }),
    );
    expect(renderedIds()).toEqual(["first", "second", "third"]);

    await mutate(() =>
      expect(useTrackStore.getState().removeTrack("second")).toEqual({ ok: true }),
    );
    expect(renderedIds()).toEqual(["first", "third"]);

    await mutate(() =>
      expect(
        useTrackStore
          .getState()
          .setTracks([createTrack("replacement", 25), createTrack("third", 15)]),
      ).toEqual({ ok: true }),
    );
    expect(renderedIds()).toEqual(["replacement", "third"]);

    await mutate(() =>
      expect(useTrackStore.getState().reorderTracks(["third", "replacement"])).toEqual({
        ok: true,
      }),
    );
    expect(renderedIds()).toEqual(["third", "replacement"]);
    expect(trackRow("third").getAttribute("transform")).toBe("translate(0,0)");
    expect(trackRow("replacement").getAttribute("transform")).toBe("translate(0,30)");
  });
});

function createStore() {
  return createTrackStore({
    modules: [module],
    tracks: [createTrack("first", 20), createTrack("second", 30)],
  });
}

function createTrack(id: string, height: number) {
  return module.create({ base: { id, title: id, height }, config: {} });
}

async function renderBrowser(useTrackStore: ReturnType<typeof createStore>) {
  const useBrowserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 1_000 } },
    region: { chromosome: "chr1", start: 0, end: 100 },
    marginWidth: 100,
    trackWidth: 1_000,
    titleSize: 10,
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <GenomeBrowser sizing="fixed" browserStore={useBrowserStore} trackStore={useTrackStore} />,
    );
    await flushEffects();
  });
}

async function mutate(mutation: () => void) {
  await act(async () => {
    mutation();
    await flushEffects();
  });
}

async function flushEffects() {
  await Promise.resolve();
  await Promise.resolve();
}

function browserSvg() {
  const element = container?.querySelector<SVGSVGElement>("#browserSVG");
  if (!element) throw new Error("Browser SVG not found");
  return element;
}

function rowRenderer(id: string) {
  const element = container?.querySelector(`[data-track-renderer="${id}"]`);
  if (!element) throw new Error(`Track renderer not found: ${id}`);
  return element;
}

function trackRow(id: string) {
  const title = Array.from(container?.querySelectorAll("text") ?? []).find(
    (element) => element.textContent === `${id} (full)`,
  );
  if (!title?.parentElement) throw new Error(`Track row not found: ${id}`);
  return title.parentElement;
}

function renderedIds() {
  return Array.from(container?.querySelectorAll("[data-track-renderer]") ?? []).map((element) =>
    element.getAttribute("data-track-renderer"),
  );
}
