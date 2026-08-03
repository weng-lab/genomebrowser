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

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

describe("GenomeBrowser region windows", () => {
  it("fetches bounded overscan windows at both chromosome boundaries", async () => {
    const fetch = vi.fn(async () => null);
    function Renderer({ width }: { width: number }) {
      return <rect data-testid="render-width" width={width} />;
    }
    const module = defineTrackModule({
      type: "bounded-fetch-test",
      configSchema: z.object({}),
      fetch,
      render: { full: Renderer },
    });
    const track = module.create({ id: "bounded", title: "Bounded", config: {} });
    const browserStore = createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 1_000 } },
      region: { chromosome: "chr1", start: 0, end: 100 },
      trackWidth: 100,
    });
    const trackStore = createTrackStore({ modules: [module], tracks: [track] });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<GenomeBrowser browserStore={browserStore} trackStore={trackStore} />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenLastCalledWith({
      config: {},
      region: { chromosome: "chr1", start: 0, end: 200 },
    });
    expect(container?.querySelector('[data-testid="render-width"]')?.getAttribute("width")).toBe(
      "200",
    );

    await act(async () => {
      browserStore.getState().setRegion({ chromosome: "chr1", start: 400, end: 500 });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetch).toHaveBeenLastCalledWith({
      config: {},
      region: { chromosome: "chr1", start: 300, end: 600 },
    });
    expect(container?.querySelector('[data-testid="render-width"]')?.getAttribute("width")).toBe(
      "300",
    );

    await act(async () => {
      browserStore.getState().setTrackWidth(200);
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(container?.querySelector('[data-testid="render-width"]')?.getAttribute("width")).toBe(
      "600",
    );
    const positionedGroups = container?.querySelectorAll<SVGGElement>(
      'g[transform="translate(-80,0)"]',
    );
    expect(
      Array.from(positionedGroups ?? []).some((group) =>
        group.querySelector('[data-testid="render-width"]'),
      ),
    ).toBe(true);

    await act(async () => {
      browserStore.getState().setRegion({ chromosome: "chr1", start: 900, end: 1_000 });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenLastCalledWith({
      config: {},
      region: { chromosome: "chr1", start: 800, end: 1_000 },
    });
  });

  it("unlocks a clamped pan when the normalized fetch window is unchanged", async () => {
    const fetch = vi.fn(async () => null);
    function Renderer({ width }: { width: number }) {
      return <rect data-testid="render-width" width={width} />;
    }
    const module = defineTrackModule({
      type: "unchanged-window-test",
      configSchema: z.object({}),
      fetch,
      render: { full: Renderer },
    });
    const track = module.create({ id: "unchanged", title: "Unchanged", config: {} });
    const browserStore = createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 1_000 } },
      region: { chromosome: "chr1", start: 0, end: 1_000 },
      trackWidth: 100,
    });
    const trackStore = createTrackStore({ modules: [module], tracks: [track] });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<GenomeBrowser browserStore={browserStore} trackStore={trackStore} />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const svg = requiredElement<SVGSVGElement>("#browserSVG");
    installSvgCoordinates(svg);
    const panTarget = Array.from(svg.querySelectorAll<SVGGElement>("g")).find(
      (group) => group.style.cursor === "grab",
    );
    if (!panTarget) throw new Error("Expected a pannable track group");
    installPointerCapture(panTarget);

    await act(async () => {
      panTarget.dispatchEvent(pointerEvent("pointerdown", 50));
      panTarget.dispatchEvent(pointerEvent("pointermove", 70));
      panTarget.dispatchEvent(pointerEvent("pointerup", 70));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(browserStore.getState().region).toEqual({ chromosome: "chr1", start: 0, end: 800 });
    expect(fetch).toHaveBeenCalledOnce();
    expect(container?.querySelector('[role="status"]')).toBeNull();
    expect(container?.querySelector('[data-testid="render-width"]')?.getAttribute("width")).toBe(
      "125",
    );
  });

  it("does not restart an identical pending fetch after a width change", async () => {
    const request = createDeferred<null>();
    const fetch = vi.fn(() => request.promise);
    function Renderer({ width }: { width: number }) {
      return <rect data-testid="render-width" width={width} />;
    }
    const module = defineTrackModule({
      type: "pending-resize-test",
      configSchema: z.object({}),
      fetch,
      render: { full: Renderer },
    });
    const track = module.create({ id: "pending", title: "Pending", config: {} });
    const browserStore = createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 1_000 } },
      region: { chromosome: "chr1", start: 100, end: 200 },
      trackWidth: 100,
    });
    const trackStore = createTrackStore({ modules: [module], tracks: [track] });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(<GenomeBrowser browserStore={browserStore} trackStore={trackStore} />),
    );
    expect(fetch).toHaveBeenCalledOnce();

    await act(async () => browserStore.getState().setTrackWidth(200));
    expect(fetch).toHaveBeenCalledOnce();

    await act(async () => request.resolve(null));
    expect(fetch).toHaveBeenCalledOnce();
    expect(container?.querySelector('[data-testid="render-width"]')?.getAttribute("width")).toBe(
      "600",
    );
  });
});

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function requiredElement<E extends Element>(selector: string) {
  const element = container?.querySelector<E>(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  return element;
}

function installSvgCoordinates(svg: SVGSVGElement) {
  const point = {
    x: 0,
    y: 0,
    matrixTransform: () => ({ x: point.x, y: point.y }),
  };
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
  Object.defineProperties(event, {
    isPrimary: { value: true },
    pointerId: { value: 1 },
  });
  return event;
}
