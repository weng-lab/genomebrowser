// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipContextProvider } from "../../src/browser/tooltip/TooltipContext";
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

async function render(width = 500, height = 300) {
  await act(async () => {
    root.render(
      <TooltipContextProvider
        store={store}
        isDisabled={() => false}
        getTooltipComponent={() => undefined}
      >
        <svg>
          <TooltipOverlay width={width} height={height} />
        </svg>
      </TooltipContextProvider>,
    );
  });
}

async function show(x: number, y: number) {
  await act(async () => store.getState().show("track", <rect />, { x, y }));
  const overlay = container.querySelector<SVGGElement>("svg > g");
  if (!overlay) throw new Error("Tooltip did not render");
  expect(overlay.style.pointerEvents).toBe("none");
  const translation = overlay.getAttribute("transform")?.match(/translate\(([^,]+),([^\)]+)\)/);
  if (!translation) throw new Error("Tooltip has no translation");
  return { left: Number(translation[1]) + box.x, top: Number(translation[2]) + box.y };
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
  });

  it("reselects the corner after browser or content dimensions change", async () => {
    await render();
    expect(await show(300, 200)).toEqual({ left: 310, top: 210 });
    await render(400, 250);
    expect(await show(300, 200)).toEqual({ left: 170, top: 130 });
    box = { ...box, width: 40, height: 20 };
    expect(await show(300, 200)).toEqual({ left: 310, top: 210 });
  });

  it("preserves the gap on the roomier side when neither corner fits", async () => {
    box = { x: -20, y: 15, width: 600, height: 400 };
    await render();
    expect(await show(200, 100)).toEqual({ left: 210, top: 110 });
    expect(await show(300, 200)).toEqual({ left: -310, top: -210 });
  });
});

describe("tooltips outside compact browser bounds", () => {
  it("escapes clipping, preserves scaled coordinates and local bounds, and dismisses on scroll", async () => {
    box = { x: -10, y: -8, width: 300, height: 220 };
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.defineProperty(svg, "getScreenCTM", {
      value: () => ({ a: 2, b: 0, c: 0, d: 2, e: 100, f: 200 }),
    });
    await act(async () =>
      root.render(
        <TooltipContextProvider
          store={store}
          isDisabled={() => false}
          getTooltipComponent={() => undefined}
        >
          <BrowserSvgProvider svg={svg}>
            <svg>
              <TooltipOverlay width={200} height={40} />
            </svg>
          </BrowserSvgProvider>
        </TooltipContextProvider>,
      ),
    );
    await act(async () => store.getState().show("track", <rect />, { x: 50, y: 10 }));
    const portal = document.querySelector<SVGSVGElement>("[data-genomebrowser-tooltip-overlay]");
    expect(portal).not.toBeNull();
    expect(container.contains(portal)).toBe(false);
    expect(portal?.getAttribute("viewBox")).toBe("-10 -8 300 220");
    expect(portal?.getAttribute("width")).toBe("600");
    expect(portal?.getAttribute("height")).toBe("440");
    expect(portal?.style.left).toBe("220px");
    expect(portal?.style.top).toBe("240px");
    expect(portal?.style.pointerEvents).toBe("none");
    await act(async () => window.dispatchEvent(new Event("scroll")));
    expect(document.querySelector("[data-genomebrowser-tooltip-overlay]")).toBeNull();
    expect(store.getState().isVisible).toBe(false);
  });

  it("fits unusually large content inside the window and removes the portal on hide", async () => {
    box = { x: 0, y: 0, width: 2000, height: 1000 };
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.defineProperty(svg, "getScreenCTM", {
      value: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    });
    await act(async () =>
      root.render(
        <TooltipContextProvider
          store={store}
          isDisabled={() => false}
          getTooltipComponent={() => undefined}
        >
          <BrowserSvgProvider svg={svg}>
            <svg>
              <TooltipOverlay width={200} height={40} />
            </svg>
          </BrowserSvgProvider>
        </TooltipContextProvider>,
      ),
    );
    await act(async () => store.getState().show("track", <rect />, { x: 190, y: 30 }));
    const portal = document.querySelector<SVGSVGElement>("[data-genomebrowser-tooltip-overlay]")!;
    expect(Number(portal.getAttribute("width"))).toBeLessThanOrEqual(window.innerWidth - 8);
    expect(Number(portal.getAttribute("height"))).toBeLessThanOrEqual(window.innerHeight - 8);
    expect(parseFloat(portal.style.left)).toBeGreaterThanOrEqual(4);
    expect(parseFloat(portal.style.top)).toBeGreaterThanOrEqual(4);
    await act(async () => store.getState().hide("track"));
    expect(document.querySelector("[data-genomebrowser-tooltip-overlay]")).toBeNull();
  });
});
