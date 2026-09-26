// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  GenomeBrowser,
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
} from "../../src/lib";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const module = defineTrackModule({
  type: "context-menu-test",
  configSchema: z.object({}),
  fetch: async () => null,
  render: { full: Renderer, dense: Renderer },
});
function Renderer({ id }: { id: string }) {
  return <rect data-testid={id} width={500} height={30} />;
}
const track = module.create({ base: { id: "test", title: "Test track" }, config: {} });
let container: HTMLDivElement;
let root: Root;
let useTrackStore: ReturnType<typeof createTrackStore>;

beforeEach(async () => {
  vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(800);
  vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(600);
  vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 120,
    height: 80,
  } as DOMRect);
  const useBrowserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10_000 } },
    trackWidth: 500,
    marginWidth: 120,
    region: { chromosome: "chr1", start: 1, end: 100 },
  });
  useTrackStore = createTrackStore({
    modules: [module],
    tracks: [track, module.create({ base: { id: "other", title: "Other" }, config: {} })],
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <GenomeBrowser sizing="fixed" browserStore={useBrowserStore} trackStore={useTrackStore} />,
    );
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

it("switches targets, commits display changes, and removes only the selected track", async () => {
  expect(menuButton("remove")).toBeNull();
  await openMenu(10, 10);
  await act(async () => menuButton("dense")!.click());
  expect(useTrackStore.getState().getTrack("test")?.base.display).toBe("dense");
  expect(useTrackStore.getState().getTrack("other")?.base.display).toBe("full");
  expect(menuButton("remove")).toBeNull();
  await openMenu(10, 10);
  await openMenu(10, 10, '[data-testid="other"]');
  await act(async () => menuButton("remove")!.click());
  expect(useTrackStore.getState().getTrack("other")).toBeUndefined();
  expect(useTrackStore.getState().getTrack("test")).toBeDefined();
  expect(container.querySelector('[data-testid="other"]')).toBeNull();
  expect(menuButton("remove")).toBeNull();
});

// Positioning cases remain provisional until real-browser coverage replaces synthetic geometry.
describe("track context menu positioning", () => {
  it.each(['[data-testid="test"]', '[aria-label="Genome browser"] rect[x="120"][y="0"]'])(
    "anchors to viewport coordinates after scrolling when opened from %s",
    async (selector) => {
      await openMenu(250, 150, selector);
      expect(menu().style.left).toBe("250px");
      expect(menu().style.top).toBe("150px");
    },
  );

  it.each([
    [0, 0, 0, 0],
    [799, 0, 680, 0],
    [0, 599, 0, 520],
    [799, 599, 680, 520],
  ])("keeps the menu inside the viewport at (%s, %s)", async (x, y, left, top) => {
    await openMenu(x, y);
    expect(menu().style.left).toBe(`${left}px`);
    expect(menu().style.top).toBe(`${top}px`);
  });

  it("repositions for a resized viewport and a subsequent right-click", async () => {
    await openMenu(700, 500);
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(640);
    vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(480);
    await act(async () => window.dispatchEvent(new Event("resize")));
    expect(menu().style.left).toBe("520px");
    expect(menu().style.top).toBe("400px");

    await openMenu(100, 100);
    expect(menu().style.left).toBe("100px");
    expect(menu().style.top).toBe("100px");
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(menuButton("remove")).toBeNull();
  });

  it.each(["window", "document", "containing panel"])(
    "dismisses when the %s scrolls and can reopen afterward",
    async (source) => {
      await openMenu(250, 150);
      const target = source === "window" ? window : source === "document" ? document : container;
      await act(async () => target.dispatchEvent(new Event("scroll")));
      expect(menuButton("remove")).toBeNull();

      await openMenu(100, 100);
      expect(menu().style.left).toBe("100px");
      await act(async () => target.dispatchEvent(new Event("scroll")));
      expect(menuButton("remove")).toBeNull();
    },
  );

  it("keeps the menu open when its own contents scroll", async () => {
    await openMenu(250, 150);
    const openMenuElement = menu();
    await act(async () => openMenuElement.dispatchEvent(new Event("scroll")));
    expect(menu()).toBe(openMenuElement);
  });
});

function menuButton(label: string) {
  return (
    Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === label,
    ) ?? null
  );
}
function menu() {
  return menuButton("remove")!.parentElement!;
}

async function openMenu(x: number, y: number, selector = '[data-testid="test"]') {
  const event = new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 2,
  });
  // jsdom does not implement page scrolling; supply the document-relative coordinates explicitly.
  Object.defineProperties(event, { pageX: { value: x + 300 }, pageY: { value: y + 900 } });
  await act(async () => container.querySelector(selector)!.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(true);
}
