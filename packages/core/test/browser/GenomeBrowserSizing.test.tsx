// @vitest-environment jsdom

import { act, StrictMode, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { GenomeBrowser } from "../../src/browser/GenomeBrowser";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { createTrackStore } from "../../src/browser/state/trackStore";
import { defineTrackModule } from "../../src/modules/defineTrackModule";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

class Observer {
  static instances: Observer[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(private callback: ResizeObserverCallback) {
    Observer.instances.push(this);
  }
  resize(width: number) {
    this.callback(
      [{ contentRect: { width } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  Observer.instances = [];
  vi.stubGlobal("ResizeObserver", Observer);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1000);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function fixture() {
  const fetch = vi.fn(async () => null);
  const module = defineTrackModule({
    type: "sizing-test",
    configSchema: z.object({}),
    fetch,
    render: {
      full: ({ width }: { width: number }) => (
        <rect data-track-width={width} width={width} height={20} />
      ),
    },
  });
  const useBrowserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10_000 } },
    region: { chromosome: "chr1", start: 1000, end: 2000 },
    marginWidth: 50,
    trackWidth: 750,
  });
  const useTrackStore = createTrackStore({
    modules: [module],
    tracks: [module.create({ base: { id: "track", title: "Track", height: 20 }, config: {} })],
  });
  return {
    useBrowserStore,
    useTrackStore,
    fetch,
    props: { browserStore: useBrowserStore, trackStore: useTrackStore },
  };
}

async function render(children: ReactNode) {
  await act(async () => root.render(children));
}

function svg(index = 0) {
  const element = container.querySelectorAll<SVGSVGElement>('svg[aria-label="Genome browser"]')[
    index
  ];
  if (!element) throw new Error("Expected browser SVG");
  return element;
}

function geometry(index = 0) {
  const element = svg(index);
  return {
    width: Number(element.getAttribute("width")),
    height: Number(element.getAttribute("height")),
    viewBox: element.getAttribute("viewBox")?.split(" ").map(Number),
  };
}

describe("browser sizing", () => {
  it.each([0.75, 1, 1.25])(
    "renders fixed logical geometry at scale %s without observing",
    async (scale) => {
      const { props, useBrowserStore } = fixture();
      await render(<GenomeBrowser {...props} sizing="fixed" scale={scale} />);
      expect(geometry()).toEqual({
        width: 800 * scale,
        height: 37 * scale,
        viewBox: [0, 0, 800, 37],
      });
      expect(Observer.instances).toHaveLength(0);
      await act(async () => {
        useBrowserStore.getState().setTrackWidth(450);
      });
      expect(geometry().width).toBe(500 * scale);
    },
  );

  it.each([0.75, 1, 1.25])(
    "fits the content box at scale %s and requests logical track resolution",
    async (scale) => {
      const { props, fetch, useBrowserStore } = fixture();
      await render(<GenomeBrowser {...props} scale={scale} />);
      expect(geometry().width).toBeCloseTo(1000);
      expect(geometry().height).toBe(37 * scale);
      expect(geometry().viewBox?.[2]).toBeCloseTo(1000 / scale);
      expect(fetch).toHaveBeenLastCalledWith(
        expect.objectContaining({
          demand: expect.objectContaining({ width: (1000 / scale - 50) * 3 }),
        }),
      );
      expect(useBrowserStore.getState().trackWidth).toBe(750);
    },
  );

  it("updates geometry immediately, debounces fetches, and retains width while hidden", async () => {
    const { props, fetch } = fixture();
    await render(<GenomeBrowser {...props} />);
    const observer = Observer.instances[0];
    for (const width of [800, 600.5, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      await act(async () => observer.resize(width));
    }
    expect(geometry().width).toBe(600.5);
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith(
      expect.objectContaining({
        demand: expect.objectContaining({ width: 550.5 * 3 }),
      }),
    );
    await act(async () => observer.resize(900));
    expect(geometry().width).toBe(900);
  });

  it("waits for a usable first measurement before fetching tracks", async () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(0);
    const { props, fetch } = fixture();
    await render(<GenomeBrowser {...props} />);
    expect(container.querySelector("svg")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    await act(async () => Observer.instances[0].resize(640));
    expect(geometry().width).toBe(640);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("derives margin and scale changes without writing to a shared store", async () => {
    const { props, useBrowserStore } = fixture();
    const children = (scale: number) => (
      <>
        <GenomeBrowser {...props} scale={scale} />
        <GenomeBrowser {...props} />
      </>
    );
    await render(children(1));
    await act(async () => Observer.instances[1].resize(600));
    await render(children(1.25));
    await act(async () => useBrowserStore.setState({ marginWidth: 100 }));
    expect(geometry(0).viewBox?.[2]).toBe(800);
    expect(geometry(1).viewBox?.[2]).toBe(600);
    expect(geometry(0).width).toBe(1000);
    expect(geometry(1).width).toBe(600);
    expect(useBrowserStore.getState().trackWidth).toBe(750);
    await act(async () => {
      useBrowserStore.getState().setTrackWidth(200);
    });
    expect(geometry(0).width).toBe(1000);
    expect(geometry(1).width).toBe(600);
  });

  it("keeps a positive track area and allows overflow below the scaled margin", async () => {
    const { props } = fixture();
    await render(<GenomeBrowser {...props} scale={2} />);
    await act(async () => Observer.instances[0].resize(40));
    expect(geometry().viewBox?.[2]).toBe(51);
    expect(geometry().width).toBe(102);
    expect(svg().parentElement?.style.overflowX).toBe("auto");
  });

  it("disconnects on mode changes and unmount, including Strict Mode", async () => {
    const { props } = fixture();
    await render(
      <StrictMode>
        <GenomeBrowser {...props} />
      </StrictMode>,
    );
    expect(Observer.instances[0].disconnect).toHaveBeenCalledOnce();
    const observer = Observer.instances.at(-1)!;
    await render(
      <StrictMode>
        <GenomeBrowser {...props} sizing="fixed" />
      </StrictMode>,
    );
    expect(observer.disconnect).toHaveBeenCalledOnce();
    await act(async () => observer.resize(200));
    expect(geometry().width).toBe(800);
    await render(
      <StrictMode>
        <GenomeBrowser {...props} />
      </StrictMode>,
    );
    expect(geometry().width).toBe(1000);
    const activeObserver = Observer.instances.at(-1)!;
    await render(null);
    expect(activeObserver.disconnect).toHaveBeenCalledOnce();
  });

  it.each([0, -1, NaN, Infinity])("rejects invalid scale %s", (scale) => {
    const { props } = fixture();
    expect(() => renderToStaticMarkup(<GenomeBrowser {...props} scale={scale} />)).toThrow(
      /scale must be a finite positive number/,
    );
  });

  it.each(["fixed", "responsive"] as const)(
    "selects genomic coordinates with scaled %s geometry",
    async (sizing) => {
      const { props, useBrowserStore } = fixture();
      useBrowserStore.getState().setSelectionMode("zoom");
      await render(<GenomeBrowser {...props} sizing={sizing} scale={1.25} />);
      const element = svg();
      installCoordinates(element, 1.25);
      const trackWidth = geometry().viewBox![2] - 50;
      const hitArea = element.querySelector("[data-selection-overlay]")!;
      await act(async () =>
        hitArea.dispatchEvent(pointerEvent("pointerdown", (50 + trackWidth * 0.25) * 1.25)),
      );
      await act(async () =>
        document.dispatchEvent(pointerEvent("pointerup", (50 + trackWidth * 0.75) * 1.25)),
      );
      expect(useBrowserStore.getState().region).toEqual({
        chromosome: "chr1",
        start: 1250,
        end: 1750,
      });
    },
  );

  it.each([0.75, 1.25])("pans in SVG coordinates at scale %s", async (scale) => {
    const { props, useBrowserStore } = fixture();
    await render(<GenomeBrowser {...props} sizing="fixed" scale={scale} />);
    const element = svg();
    installCoordinates(element, scale);
    const target = Array.from(element.querySelectorAll("g")).find(
      (group) => group.style.cursor === "grab",
    )!;
    Object.assign(target, {
      hasPointerCapture: () => false,
      setPointerCapture: () => {},
      releasePointerCapture: () => {},
    });
    await act(async () => {
      target.dispatchEvent(pointerEvent("pointerdown", 200 * scale));
      target.dispatchEvent(pointerEvent("pointermove", 350 * scale));
      target.dispatchEvent(pointerEvent("pointerup", 350 * scale));
    });
    expect(useBrowserStore.getState().region).toEqual({
      chromosome: "chr1",
      start: 800,
      end: 1800,
    });
  });
});

function installCoordinates(element: SVGSVGElement, scale: number) {
  const point = { x: 0, y: 0, matrixTransform: () => ({ x: point.x / scale, y: point.y / scale }) };
  Object.assign(element, {
    createSVGPoint: () => point,
    getScreenCTM: () => ({ inverse: () => ({}) }),
  });
}

function pointerEvent(type: string, clientX: number) {
  const event = new MouseEvent(type, { bubbles: true, button: 0, clientX });
  Object.defineProperties(event, { isPrimary: { value: true }, pointerId: { value: 1 } });
  return event;
}
