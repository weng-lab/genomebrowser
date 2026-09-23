// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import * as publicApi from "../../src/lib";
import {
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
  GenomeBrowser,
  useGenomeBrowser,
  useTooltip,
  type GenomeBrowserStores,
} from "../../src/lib";
import { BrowserProvider } from "../../src/browser/state/BrowserContext";
import { createContextMenuStore } from "../../src/browser/state/contextMenuStore";
import { createSettingsStore } from "../../src/browser/state/settingsStore";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
let root: Root | undefined;
let container: HTMLDivElement | undefined;
const originalGetBBox = Object.getOwnPropertyDescriptor(SVGElement.prototype, "getBBox");

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.restoreAllMocks();
  if (originalGetBBox) Object.defineProperty(SVGElement.prototype, "getBBox", originalGetBBox);
  else Reflect.deleteProperty(SVGElement.prototype, "getBBox");
});

function createStores(start = 0): GenomeBrowserStores {
  return {
    useBrowserStore: createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 10000 } },
      region: { chromosome: "chr1", start, end: start + 100 },
      trackWidth: 500,
    }),
    useTrackStore: createTrackStore({ modules: [] }),
  };
}

async function render(content: ReactNode) {
  if (!root) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  }
  await act(async () => root?.render(content));
}

describe("useGenomeBrowser", () => {
  it("replaces the three context exports and reports a missing provider", () => {
    expect(publicApi).not.toHaveProperty("useBrowserStore");
    expect(publicApi).not.toHaveProperty("useTrackStore");
    expect(publicApi).not.toHaveProperty("useTrackStoreApi");
    function Orphan() {
      useGenomeBrowser();
      return null;
    }
    expect(() => renderToStaticMarkup(<Orphan />)).toThrow(
      "useGenomeBrowser must be used within a GenomeBrowser",
    );
  });

  it("preserves bound stores, selective subscriptions, and replacement instances", async () => {
    const first = createStores();
    const second = createStores(500);
    let resolved: GenomeBrowserStores | undefined;
    let contextRenders = 0;
    let selectorRenders = 0;
    function ContextConsumer() {
      resolved = useGenomeBrowser();
      contextRenders++;
      return null;
    }
    function SelectorConsumer() {
      const { useBrowserStore, useTrackStore } = useGenomeBrowser();
      const start = useBrowserStore((state) => state.region.start);
      const count = useTrackStore((state) => state.order.length);
      selectorRenders++;
      return (
        <span>
          {start}:{count}
        </span>
      );
    }
    const extras = {
      contextMenuStore: createContextMenuStore(),
      settingsStore: createSettingsStore(),
    };
    const view = (stores: GenomeBrowserStores) => (
      <BrowserProvider
        value={{
          ...extras,
          browserStore: stores.useBrowserStore,
          trackStore: stores.useTrackStore,
        }}
      >
        <ContextConsumer />
        <SelectorConsumer />
      </BrowserProvider>
    );
    await render(view(first));
    expect(Object.keys(resolved!).sort()).toEqual(["useBrowserStore", "useTrackStore"]);
    expect(resolved?.useBrowserStore).toBe(first.useBrowserStore);
    expect(resolved?.useTrackStore).toBe(first.useTrackStore);
    await render(view(first));
    expect(resolved?.useBrowserStore).toBe(first.useBrowserStore);
    expect(resolved?.useTrackStore).toBe(first.useTrackStore);
    const initialSelectorRenders = selectorRenders;
    const initialContextRenders = contextRenders;
    const browserListener = vi.fn();
    const trackListener = vi.fn();
    const unsubscribeBrowser = resolved!.useBrowserStore.subscribe(browserListener);
    const unsubscribeTrack = resolved!.useTrackStore.subscribe(trackListener);
    await act(async () => {
      first.useBrowserStore.getState().setSelectionMode("zoom");
    });
    expect(browserListener).toHaveBeenCalledOnce();
    expect(selectorRenders).toBe(initialSelectorRenders);
    expect(contextRenders).toBe(initialContextRenders);
    await act(async () => {
      first.useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 20, end: 120 });
    });
    expect(container?.textContent).toBe("20:0");
    expect(selectorRenders).toBe(initialSelectorRenders + 1);
    expect(contextRenders).toBe(initialContextRenders);
    const module = defineTrackModule({
      type: "count",
      configSchema: z.object({}),
      fetch: async () => null,
      render: { full: () => null },
    });
    // Replace the supplied track store, then exercise its selector and imperative API.
    second.useTrackStore = createTrackStore({ modules: [module] });
    await render(view(second));
    expect(resolved?.useBrowserStore).toBe(second.useBrowserStore);
    expect(resolved?.useTrackStore).toBe(second.useTrackStore);
    expect(container?.textContent).toBe("500:0");
    const secondTrackListener = vi.fn();
    const unsubscribeSecondTrack = resolved!.useTrackStore.subscribe(secondTrackListener);
    await act(async () => {
      second.useTrackStore
        .getState()
        .addTrack(module.create({ base: { id: "count", title: "Count" }, config: {} }));
    });
    expect(container?.textContent).toBe("500:1");
    expect(secondTrackListener).toHaveBeenCalledOnce();
    expect(first.useTrackStore.getState().order).toEqual([]);
    expect(trackListener).not.toHaveBeenCalled();
    await act(async () => {
      first.useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 40, end: 140 });
    });
    expect(container?.textContent).toBe("500:1");
    unsubscribeBrowser();
    unsubscribeTrack();
    unsubscribeSecondTrack();
  });

  it("resolves independent browsers in shared renderers, settings, and tooltips", async () => {
    const observed = new Map<string, GenomeBrowserStores>();
    function useObservedStores(location: string) {
      const stores = useGenomeBrowser();
      const start = stores.useBrowserStore((state) => state.region.start);
      observed.set(`${location}:${start}`, stores);
      return stores;
    }
    function Renderer() {
      const { useBrowserStore } = useObservedStores("renderer");
      const start = useBrowserStore((state) => state.region.start);
      const tooltip = useTooltip();
      return (
        <rect
          data-renderer={start}
          width={50}
          height={20}
          onMouseOver={() => tooltip.show({}, { clientX: 10, clientY: 10 })}
        />
      );
    }
    function Settings() {
      const { useTrackStore } = useObservedStores("settings");
      return (
        <button
          data-resize
          onClick={() => useTrackStore.getState().updateTrack("shared", { base: { height: 80 } })}
        >
          Resize
        </button>
      );
    }
    function Tooltip() {
      useObservedStores("tooltip");
      return <text>Hosted tooltip</text>;
    }
    const module = defineTrackModule({
      type: "shared",
      configSchema: z.object({}),
      fetch: async () => null,
      render: { full: Renderer },
      settingsComponent: Settings,
      tooltipComponent: Tooltip,
    });
    const first = createStores();
    const second = createStores(500);
    for (const stores of [first, second]) {
      stores.useTrackStore = createTrackStore({
        modules: [module],
        tracks: [
          module.create({ base: { id: "shared", title: "Shared", height: 40 }, config: {} }),
        ],
      });
    }
    Object.defineProperty(SVGElement.prototype, "getBBox", {
      configurable: true,
      value: () => ({ x: 0, y: 0, width: 100, height: 20 }),
    });
    await render(
      <>
        {[first, second].map((stores, index) => (
          <div key={index} data-browser={index}>
            <GenomeBrowser
              sizing="fixed"
              browserStore={stores.useBrowserStore}
              trackStore={stores.useTrackStore}
            />
          </div>
        ))}
      </>,
    );
    for (const [index, stores] of [first, second].entries()) {
      const host = container!.querySelector(`[data-browser="${index}"]`)!;
      const point = { x: 0, y: 0, matrixTransform: () => ({ x: 10, y: 10 }) };
      Object.assign(host.querySelector("svg")!, {
        createSVGPoint: () => point,
        getScreenCTM: () => ({ inverse: () => ({}) }),
      });
      await act(async () => {
        host
          .querySelector('[aria-label="Settings for Shared"]')!
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      await act(async () => {
        host
          .querySelector("[data-renderer]")!
          .dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      });
      await act(async () => {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      });
      const start = stores.useBrowserStore.getState().region.start;
      for (const location of ["renderer", "settings", "tooltip"]) {
        expect(observed.get(`${location}:${start}`)?.useBrowserStore, `${location}:${start}`).toBe(
          stores.useBrowserStore,
        );
        expect(observed.get(`${location}:${start}`)?.useTrackStore).toBe(stores.useTrackStore);
      }
    }
    await act(async () => {
      container!
        .querySelector('[data-browser="0"] [data-resize]')!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(first.useTrackStore.getState().getTrack("shared")?.base.height).toBe(80);
    expect(second.useTrackStore.getState().getTrack("shared")?.base.height).toBe(40);
    await act(async () => {
      observed
        .get("renderer:0")!
        .useBrowserStore.getState()
        .setRegion({ chromosome: "chr1", start: 100, end: 200 });
    });
    expect(first.useBrowserStore.getState().region.start).toBe(100);
    expect(second.useBrowserStore.getState().region.start).toBe(500);
  });
});

it("hosts application children outside the SVG with the supplied browser context", async () => {
  const first = createStores();
  const second = createStores(500);
  function Child() {
    const { useBrowserStore } = useGenomeBrowser();
    const start = useBrowserStore((state) => state.region.start);
    return <button data-hosted-child>{start}</button>;
  }
  await render(
    <>
      <GenomeBrowser
        browserStore={first.useBrowserStore}
        trackStore={first.useTrackStore}
        sizing="fixed"
      >
        <Child />
      </GenomeBrowser>
      <GenomeBrowser
        browserStore={second.useBrowserStore}
        trackStore={second.useTrackStore}
        sizing="fixed"
      >
        <Child />
      </GenomeBrowser>
    </>,
  );
  const children = container!.querySelectorAll("[data-hosted-child]");
  expect([...children].map((child) => child.textContent)).toEqual(["0", "500"]);
  expect(children[0].closest("svg")).toBeNull();
  await act(async () => {
    second.useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 700, end: 800 });
  });
  expect([...children].map((child) => child.textContent)).toEqual(["0", "700"]);
});
