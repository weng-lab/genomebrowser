// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ContextMenuController } from "../../src/browser/overlays/ContextMenuController";
import { BrowserProvider, InteractionGateProvider } from "../../src/browser/state/BrowserContext";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { createContextMenuStore } from "../../src/browser/state/contextMenuStore";
import { RegistryProvider } from "../../src/browser/state/RegistryContext";
import { createSettingsStore } from "../../src/browser/state/settingsStore";
import { createTrackStore } from "../../src/browser/state/trackStore";
import { TrackFrame } from "../../src/browser/track-row/TrackFrame";
import { hg38 } from "../../src/genome/presets";
import { defineTrackModule } from "../../src/modules/defineTrackModule";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const module = defineTrackModule({
  type: "context-menu-test",
  configSchema: z.object({}),
  fetch: async () => null,
  render: { full: () => null },
});
const track = module.create({ id: "test", title: "Test track", config: {} });
let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(800);
  vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(600);
  vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 120,
    height: 80,
  } as DOMRect);
  const useBrowserStore = createBrowserStore({
    assembly: hg38,
    region: { chromosome: "chr1", start: 1, end: 100 },
  });
  const useTrackStore = createTrackStore({ modules: [module], tracks: [track] });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <RegistryProvider registry={useTrackStore.getState().registry}>
        <BrowserProvider
          value={{
            browserStore: useBrowserStore,
            trackStore: useTrackStore,
            contextMenuStore: createContextMenuStore(),
            settingsStore: createSettingsStore(),
          }}
        >
          <InteractionGateProvider value={{ isInteractionBlocked: false }}>
            <svg>
              <TrackFrame track={track} y={0} marginWidth={120} trackWidth={500} titleSize={12}>
                <rect data-testid="track-data" width={500} height={track.base.height} />
              </TrackFrame>
            </svg>
            <ContextMenuController />
          </InteractionGateProvider>
        </BrowserProvider>
      </RegistryProvider>,
    );
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("track context menu positioning", () => {
  it.each(['[data-testid="track-data"]', 'rect[x="120"][y="0"]'])(
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
    expect(container.querySelector("button")).toBeNull();
  });

  it.each(["window", "document", "containing panel"])(
    "dismisses when the %s scrolls and can reopen afterward",
    async (source) => {
      await openMenu(250, 150);
      const target = source === "window" ? window : source === "document" ? document : container;
      await act(async () => target.dispatchEvent(new Event("scroll")));
      expect(container.querySelector("button")).toBeNull();

      await openMenu(100, 100);
      expect(menu().style.left).toBe("100px");
      await act(async () => target.dispatchEvent(new Event("scroll")));
      expect(container.querySelector("button")).toBeNull();
    },
  );

  it("keeps the menu open when its own contents scroll", async () => {
    await openMenu(250, 150);
    const openMenuElement = menu();
    await act(async () => openMenuElement.dispatchEvent(new Event("scroll")));
    expect(menu()).toBe(openMenuElement);
  });
});

function menu() {
  return container.querySelector("button")!.parentElement!;
}

async function openMenu(x: number, y: number, selector = '[data-testid="track-data"]') {
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
