// @vitest-environment jsdom

import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserProvider } from "../../src/browser/state/BrowserContext";
import { idleDataSource } from "./idleDataSource";
import { createBrowserContextValue } from "../../src/browser/state/browserContextState";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { createTrackStore } from "../../src/browser/state/trackStore";
import { BrowserSvgProvider } from "../../src/browser/svg/BrowserSvgContext";
import { TooltipOverlay } from "../../src/browser/tooltip/TooltipOverlay";
import { createTooltipStore } from "../../src/browser/tooltip/tooltipStore";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const originalGetBBox = Object.getOwnPropertyDescriptor(SVGElement.prototype, "getBBox");
let box = { x: 0, y: 0, width: 120, height: 60 };
let container: HTMLDivElement;
let root: Root;
let store: ReturnType<typeof createTooltipStore>;
const browserContext = createBrowserContextValue(
  createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 1000 } },
    region: { chromosome: "chr1", start: 0, end: 100 },
  }),
  createTrackStore({ modules: [], tracks: [] }),
  idleDataSource,
  () => false,
);

beforeEach(() => {
  box = { x: 0, y: 0, width: 120, height: 60 };
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: vi.fn(() => box),
  });
  store = createTooltipStore();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  if (originalGetBBox) {
    Object.defineProperty(SVGElement.prototype, "getBBox", originalGetBBox);
  } else {
    Reflect.deleteProperty(SVGElement.prototype, "getBBox");
  }
});

async function render(width = 500, height = 300, matrix = { a: 1, b: 0, e: 0, f: 0 }) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  Object.defineProperty(svg, "getScreenCTM", { value: () => ({ c: 0, d: matrix.a, ...matrix }) });
  await act(async () => {
    root.render(
      <BrowserProvider value={{ ...browserContext, tooltipStore: store }}>
        <BrowserSvgProvider svg={svg}>
          <svg>
            <TooltipOverlay width={width} height={height} />
          </svg>
        </BrowserSvgProvider>
      </BrowserProvider>,
    );
  });
}

function getOverlay() {
  return document.querySelector<SVGSVGElement>("[data-genomebrowser-tooltip-overlay]");
}

async function show(x: number, y: number, content = <rect />) {
  await act(async () => store.getState().show("track", content, { x, y }));
  const overlay = getOverlay();
  if (!overlay) throw new Error("Tooltip did not render");
  expect(container.contains(overlay)).toBe(false);
  expect(overlay.style.pointerEvents).toBe("none");
  return { left: parseFloat(overlay.style.left), top: parseFloat(overlay.style.top) };
}

describe("tooltip corner positioning", () => {
  it.each([
    ["top-left", 0, 0, 10, 10],
    ["top", 250, 0, 260, 10],
    ["top-right", 500, 0, 370, 10],
    ["right", 500, 150, 370, 160],
    ["bottom-right", 500, 300, 370, 230],
    ["bottom", 250, 300, 260, 230],
    ["bottom-left", 0, 300, 10, 230],
    ["left", 0, 150, 10, 160],
  ])(
    "keeps the corner 10 units from the pointer at the %s boundary",
    async (_, x, y, left, top) => {
      await render();
      const position = await show(x, y);
      expect(position).toEqual({ left, top });
      expect(position.left).toBeGreaterThanOrEqual(0);
      expect(position.top).toBeGreaterThanOrEqual(0);
      expect(position.left + box.width).toBeLessThanOrEqual(500);
      expect(position.top + box.height).toBeLessThanOrEqual(300);
    },
  );

  it("switches corners as the pointer crosses each fit threshold and returns", async () => {
    await render();
    expect(await show(370, 230)).toEqual({ left: 380, top: 240 });
    expect(await show(371, 230)).toEqual({ left: 241, top: 240 });
    expect(await show(371, 231)).toEqual({ left: 241, top: 161 });
    expect(await show(370, 231)).toEqual({ left: 380, top: 161 });
    expect(await show(370, 230)).toEqual({ left: 380, top: 240 });
  });

  it.each([
    [35, 20],
    [-80, -40],
  ])("anchors actual content bounds with local origin (%s, %s)", async (x, y) => {
    box = { ...box, x, y };
    await render();
    expect(await show(0, 0)).toEqual({ left: 10, top: 10 });
    expect(await show(500, 300)).toEqual({ left: 370, top: 230 });
    expect(getOverlay()?.getAttribute("viewBox")).toBe(`${x} ${y} 120 60`);
  });

  it("reselects the corner after browser or content dimensions change", async () => {
    await render();
    expect(await show(300, 200)).toEqual({ left: 310, top: 210 });
    await render(400, 250);
    expect(await show(300, 200)).toEqual({ left: 170, top: 130 });
    box = { ...box, width: 40, height: 20 };
    expect(await show(300, 200)).toEqual({ left: 310, top: 210 });
  });

  it("maps the browser's screen scale and offset onto the overlay", async () => {
    await render(500, 300, { a: 2, b: 0, e: 100, f: 200 });
    expect(await show(500, 300)).toEqual({ left: 840, top: 660 });
    expect(getOverlay()?.getAttribute("width")).toBe("240");
    expect(getOverlay()?.getAttribute("height")).toBe("120");
  });
});

describe("tooltips outside compact browser bounds", () => {
  it("places against the window at browser scale", async () => {
    box = { x: -10, y: -8, width: 300, height: 220 };
    await render(200, 40, { a: 2, b: 0, e: 100, f: 200 });
    expect(await show(50, 10)).toEqual({ left: 220, top: 240 });
    const overlay = getOverlay();
    expect(overlay?.getAttribute("viewBox")).toBe("-10 -8 300 220");
    expect(overlay?.getAttribute("width")).toBe("600");
    expect(overlay?.getAttribute("height")).toBe("440");
  });

  it("keeps content larger than the window at full size from the top-left margin", async () => {
    box = { x: 0, y: 0, width: 2000, height: 1000 };
    await render(200, 40);
    expect(await show(190, 30)).toEqual({ left: 4, top: 4 });
    expect(getOverlay()?.getAttribute("width")).toBe("2000");
    expect(getOverlay()?.getAttribute("height")).toBe("1000");
    await act(async () => store.getState().hide("track"));
    expect(getOverlay()).toBeNull();
  });

  it("keeps content mounted when the tooltip crosses the browser boundary", async () => {
    const mounted = vi.fn();
    function Content() {
      useEffect(() => mounted(), []);
      return <rect />;
    }
    await render(200, 100);
    expect(await show(0, 0, <Content />)).toEqual({ left: 10, top: 10 });
    expect(await show(100, 50, <Content />)).toEqual({ left: 110, top: 60 });
    expect(await show(0, 0, <Content />)).toEqual({ left: 10, top: 10 });
    expect(mounted).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["inside", 0, 0],
    ["outside", 190, 30],
  ])("dismisses a tooltip %s the browser on scroll", async (_, x, y) => {
    await render(200, 40);
    await show(x, y);
    await act(async () => window.dispatchEvent(new Event("scroll")));
    expect(getOverlay()).toBeNull();
    expect(store.getState().isVisible).toBe(false);
  });
});
