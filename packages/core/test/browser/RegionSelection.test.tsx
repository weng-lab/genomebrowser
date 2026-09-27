// @vitest-environment jsdom

import { act, useLayoutEffect, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegionSelection } from "../../src/browser/viewport/RegionSelection";
import {
  BrowserContext,
  createBrowserContextValue,
} from "../../src/browser/state/browserContextState";
import {
  createBrowserStore,
  type BrowserStoreInput,
  type BrowserStoreInstance,
} from "../../src/browser/state/browserStore";
import { createTrackStore } from "../../src/browser/state/trackStore";
import type { GenomicRegion } from "../../src/genome/region";
import { idleDataSource } from "./idleDataSource";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const initialRegion = { chromosome: "chr1", start: 100, end: 200 };
let svg: SVGSVGElement | undefined;
let root: Root | undefined;
let store: BrowserStoreInstance;
let context: ReturnType<typeof createBrowserContextValue>;

type Geometry = {
  region: GenomicRegion;
  svg?: SVGSVGElement | null;
  trackWidth?: number;
  marginWidth?: number;
  totalHeight?: number;
  children?: ReactNode;
};

async function mount(input: Partial<BrowserStoreInput> = {}, geometry: Partial<Geometry> = {}) {
  store = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 1_000, chr2: 1_000 } },
    region: initialRegion,
    selectionMode: "zoom",
    ...input,
  });
  context = createBrowserContextValue(
    store,
    createTrackStore({ modules: [], tracks: [] }),
    idleDataSource,
  );
  svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const point = { x: 0, y: 0, matrixTransform: () => ({ x: point.x, y: point.y }) };
  Object.assign(svg, {
    createSVGPoint: () => point,
    getScreenCTM: () => ({ inverse: () => ({}) }),
  });
  document.body.appendChild(svg);
  root = createRoot(svg);
  await render({ region: store.getState().region, ...geometry });
  return store;
}

async function render(
  {
    region,
    svg: selectionSvg = svg!,
    trackWidth = 100,
    marginWidth = 20,
    totalHeight = 100,
    children = null,
  }: Geometry,
  observer?: ReactNode,
  update?: () => void,
) {
  await act(async () => {
    update?.();
    root?.render(
      <BrowserContext.Provider value={context}>
        <RegionSelection
          svg={selectionSvg}
          marginWidth={marginWidth}
          trackWidth={trackWidth}
          totalHeight={totalHeight}
          region={region}
        >
          {children}
        </RegionSelection>
        {observer}
      </BrowserContext.Provider>,
    );
  });
}

async function changeMode(mode: "pan" | "zoom" | "highlight") {
  await act(async () => {
    store.getState().setSelectionMode(mode);
  });
}

async function changeBlocked(isLoading: boolean) {
  await act(async () => {
    store.setState({ isLoading });
  });
}

async function startSelection(startX: number, endX: number) {
  const hitArea = svg?.querySelector("[data-selection-overlay]") ?? svg?.querySelector("rect");
  if (!hitArea) throw new Error("Expected selection hit area");
  await act(async () => {
    hitArea.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: startX }),
    );
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: endX }));
  });
}

async function dragSelection(startX: number, endX: number) {
  await startSelection(startX, endX);
  await act(async () => {
    document.dispatchEvent(new MouseEvent("pointerup", { clientX: endX }));
  });
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  svg?.remove();
  root = undefined;
  svg = undefined;
  vi.restoreAllMocks();
});

describe("RegionSelection", () => {
  it("starts ruler Zoom before track panning and survives the store mode update", async () => {
    const onPan = vi.fn();
    const children = (
      <g onPointerDown={onPan}>
        <g data-genomebrowser-selection-mode="zoom">
          <rect data-zoom-target="" />
        </g>
      </g>
    );
    await mount({ selectionMode: "pan" }, { children });
    await act(async () => {
      svg!
        .querySelector("[data-zoom-target]")!
        .dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 90 }));
    });
    expect(store.getState().selectionMode).toBe("zoom");
    expect(onPan).not.toHaveBeenCalled();
    await act(async () => {
      document.dispatchEvent(new MouseEvent("pointermove", { clientX: 40 }));
    });
    const selection = svg!.querySelector("[data-region-selection]")!;
    expect([
      selection.getAttribute("height"),
      selection.getAttribute("x"),
      selection.getAttribute("width"),
    ]).toEqual(["100", "40", "50"]);
    await act(async () => {
      document.dispatchEvent(new MouseEvent("pointerup", { clientX: 40 }));
    });
    expect(store.getState().region).toEqual({ chromosome: "chr1", start: 120, end: 170 });
    expect(svg!.querySelector("[data-region-selection]")).toBeNull();
  });

  it.each([
    { blocked: true, button: 0, clientX: 60 },
    { blocked: false, button: 2, clientX: 60 },
    { blocked: false, button: 0, clientX: 10 },
  ])(
    "does not switch modes for an ineligible marked press: %j",
    async ({ blocked, button, clientX }) => {
      await mount(
        { selectionMode: "pan" },
        { children: <rect data-genomebrowser-selection-mode="zoom" /> },
      );
      if (blocked) await changeBlocked(true);
      await act(async () => {
        svg!
          .querySelector("[data-genomebrowser-selection-mode]")!
          .dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button, clientX }));
      });
      expect(store.getState().selectionMode).toBe("pan");
      expect(svg!.querySelector("[data-region-selection]")).toBeNull();
    },
  );

  it("tracks the guide only on the overlay and removes it in Pan or while blocked", async () => {
    await mount();
    const overlay = svg!.querySelector("[data-selection-overlay]")!;
    const guide = svg!.querySelector<SVGLineElement>("[data-cursor-guide]")!;
    expect(guide.style.visibility).toBe("hidden");
    await act(async () => {
      overlay.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 55 }));
    });
    expect(guide.getAttribute("x1")).toBe("55");
    expect(guide.style.visibility).toBe("visible");
    await act(async () => {
      overlay.dispatchEvent(new MouseEvent("pointerout", { bubbles: true }));
    });
    expect(guide.style.visibility).toBe("hidden");
    await changeMode("pan");
    expect(svg!.querySelector("[data-selection-overlay]")).toBeNull();
    expect(svg!.querySelector("[data-cursor-guide]")).toBeNull();
    await changeMode("zoom");
    await changeBlocked(true);
    expect(svg!.querySelector("[data-selection-overlay]")).toBeNull();
    expect(svg!.querySelector("[data-cursor-guide]")).toBeNull();
  });

  it("preserves margin controls and restores track interactions in Pan", async () => {
    const onTrack = vi.fn();
    const onMargin = vi.fn();
    await mount(
      {},
      {
        children: (
          <g>
            <rect data-margin="" onClick={onMargin} />
            <rect data-track="" onPointerMove={onTrack} />
          </g>
        ),
      },
    );
    await act(async () => {
      svg!
        .querySelector("[data-margin]")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onMargin).toHaveBeenCalledOnce();
    const contextMenu = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    await act(async () => {
      svg!.querySelector("[data-selection-overlay]")!.dispatchEvent(contextMenu);
    });
    expect(contextMenu.defaultPrevented).toBe(true);
    await changeMode("pan");
    expect(svg!.querySelector("[data-selection-overlay]")).toBeNull();
    await act(async () => {
      svg!
        .querySelector("[data-track]")!
        .dispatchEvent(new MouseEvent("pointermove", { bubbles: true }));
    });
    expect(onTrack).toHaveBeenCalledOnce();
  });

  it.each(["zoom", "highlight"] as const)(
    "covers track content and commits %s without invoking tracks",
    async (mode) => {
      const onHover = vi.fn(),
        onPointerDown = vi.fn(),
        onClick = vi.fn();
      await mount(
        { selectionMode: mode },
        {
          children: (
            <rect
              data-track-content=""
              onPointerMove={onHover}
              onPointerDown={onPointerDown}
              onClick={onClick}
            />
          ),
        },
      );
      const content = svg!.querySelector("[data-track-content]")!;
      const target = svg!.querySelector("[data-selection-overlay]")!;
      expect(
        content.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect([target.getAttribute("x"), target.getAttribute("width")]).toEqual(["20", "100"]);
      expect((target as SVGElement).style.cursor).toBe("crosshair");
      await act(async () => {
        target.dispatchEvent(new MouseEvent("pointermove", { bubbles: true }));
        target.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 30 }));
        document.dispatchEvent(new MouseEvent("pointerup", { clientX: 80 }));
        target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(onHover).not.toHaveBeenCalled();
      expect(onPointerDown).not.toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
      if (mode === "zoom") {
        expect(store.getState().region).toEqual({ chromosome: "chr1", start: 110, end: 160 });
        expect(store.getState().highlights).toEqual([]);
      } else {
        expect(store.getState().region).toEqual(initialRegion);
        expect(store.getState().highlights[0]?.region).toEqual({
          chromosome: "chr1",
          start: 110,
          end: 160,
        });
      }
    },
  );

  it.each(["zoom", "highlight"] as const)(
    "cancels %s with Escape without committing and allows the next selection",
    async (mode) => {
      await mount({
        selectionMode: mode,
        highlights: [{ id: "existing", region: initialRegion, color: "#ff0000" }],
      });
      const before = store.getState();
      await startSelection(30, 80);
      expect(svg!.querySelector("[data-region-selection]")).not.toBeNull();
      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });
      expect(svg!.querySelector("[data-region-selection]")).toBeNull();
      await act(async () => {
        document.dispatchEvent(new MouseEvent("pointermove", { clientX: 95 }));
        document.dispatchEvent(new MouseEvent("pointerup", { clientX: 95 }));
      });
      expect(store.getState()).toBe(before);
      const idleEscape = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
      await act(async () => {
        document.dispatchEvent(idleEscape);
      });
      expect(idleEscape.defaultPrevented).toBe(false);
      await dragSelection(45, 95);
      if (mode === "zoom") {
        expect(store.getState().region).toEqual({ chromosome: "chr1", start: 125, end: 175 });
        expect(store.getState().highlights).toBe(before.highlights);
      } else {
        expect(store.getState().region).toBe(before.region);
        expect(store.getState().highlights[1]?.region).toEqual({
          chromosome: "chr1",
          start: 125,
          end: 175,
        });
      }
      expect(store.getState().selectionMode).toBe(mode);
      expect(svg!.querySelector("[data-region-selection]")).toBeNull();
    },
  );

  it("leaves keyboard events and modifier drags to the application in Pan", async () => {
    await mount({ selectionMode: "pan" });
    for (const key of ["p", "z", "h", "Escape"]) {
      const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      await act(async () => {
        svg!.dispatchEvent(event);
      });
      expect(event.defaultPrevented).toBe(false);
    }
    for (const altKey of [false, true]) {
      await act(async () => {
        svg!
          .querySelector("rect")!
          .dispatchEvent(
            new MouseEvent("pointerdown", { bubbles: true, clientX: 30, shiftKey: true, altKey }),
          );
        document.dispatchEvent(new MouseEvent("pointerup", { clientX: 80 }));
      });
    }
    expect(store.getState().region).toEqual(initialRegion);
    expect(store.getState().highlights).toEqual([]);
  });

  it("creates chromosome-scoped highlights with the configured style without zooming", async () => {
    await mount({
      selectionMode: "highlight",
      selectionHighlight: { color: "#ff0000", opacity: 0.7, type: "outlined" },
    });
    await dragSelection(95, 45);
    expect(store.getState().region).toEqual(initialRegion);
    expect(store.getState().highlights).toEqual([
      {
        id: "chr1:125-175",
        region: { chromosome: "chr1", start: 125, end: 175 },
        color: "#ff0000",
        opacity: 0.7,
        type: "outlined",
      },
    ]);
  });

  it("keeps repeated selections distinct from existing region IDs", async () => {
    await mount({
      selectionMode: "highlight",
      highlights: ["chr1:125-175", "chr1:125-175 (2)"].map((id) => ({
        id,
        region: initialRegion,
        color: "#ff0000",
      })),
    });
    await dragSelection(45, 95);
    expect(store.getState().highlights[2]?.id).toBe("chr1:125-175 (3)");
  });

  it.each(["pointercancel", "blur"])("cancels on %s", async (action) => {
    await mount();
    await startSelection(30, 80);
    await act(async () => {
      if (action === "blur") window.dispatchEvent(new Event("blur"));
      else document.dispatchEvent(new MouseEvent(action));
      document.dispatchEvent(new MouseEvent("pointerup", { clientX: 80 }));
    });
    expect(store.getState().region).toEqual(initialRegion);
  });

  it("leaves plain drags to Pan and rejects margin and right-button starts", async () => {
    await mount({ selectionMode: "pan" });
    await dragSelection(30, 80);
    expect(store.getState().region).toEqual(initialRegion);
    await changeMode("zoom");
    await dragSelection(10, 80);
    await act(async () => {
      svg!
        .querySelector("[data-selection-overlay]")!
        .dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 2, clientX: 30 }));
    });
    await act(async () => {
      document.dispatchEvent(new MouseEvent("pointerup", { clientX: 80 }));
    });
    expect(store.getState().region).toEqual(initialRegion);
  });

  it("commits ordinary selection away from chromosome boundaries", async () => {
    await mount();
    await dragSelection(45, 95);
    expect(store.getState().region).toEqual({ chromosome: "chr1", start: 125, end: 175 });
  });

  it.each([
    ["lower", 20, 70, { chromosome: "chr1", start: 0, end: 50 }],
    ["upper", 70, 150, { chromosome: "chr1", start: 50, end: 100 }],
  ] as const)(
    "clamps selection to the %s viewport and chromosome boundary",
    async (_edge, startX, endX, expected) => {
      await mount({
        assembly: { id: "test", chromosomes: { chr1: 100 } },
        region: { chromosome: "chr1", start: 0, end: 100 },
      });
      await dragSelection(startX, endX);
      expect(store.getState().region).toEqual(expected);
    },
  );

  it("keeps a selection at base resolution nonempty", async () => {
    const region = { chromosome: "chr1", start: 0, end: 1 };
    await mount({ region });
    const before = store.getState().region;
    await dragSelection(20, 30);
    expect(store.getState().region).toEqual(before);
    expect(svg!.querySelector("[data-region-selection]")).toBeNull();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid track width %s",
    async (trackWidth) => {
      await mount({}, { trackWidth });
      await dragSelection(20, 80);
      expect(store.getState().region).toEqual(initialRegion);
      expect(svg!.querySelector("[data-region-selection]")).toBeNull();
    },
  );

  it.each([
    ["margin width", { marginWidth: 0 }],
    ["non-finite margin width", { marginWidth: Number.NaN }],
    ["total height", { totalHeight: 0 }],
    ["non-finite total height", { totalHeight: Number.POSITIVE_INFINITY }],
  ] as const)("rejects invalid %s", async (_name, dimensions) => {
    await mount({}, dimensions);
    await dragSelection(20, 80);
    expect(store.getState().region).toEqual(initialRegion);
  });

  it.each(["zoom", "highlight"] as const)(
    "invalidates %s before layout observers or native input see changed context",
    async (mode) => {
      const observe = vi.fn();
      let mounts = 0;
      function Child() {
        useLayoutEffect(() => {
          mounts += 1;
        }, []);
        return <rect data-child="" />;
      }
      function Observer() {
        useLayoutEffect(() => {
          observe(svg?.querySelector("[data-region-selection]"));
          document.dispatchEvent(new MouseEvent("pointerup", { clientX: 95 }));
        });
        return null;
      }
      const original = { region: { chromosome: "chr1", start: 20, end: 40 }, children: <Child /> };
      await mount({ region: original.region, selectionMode: mode }, original);
      const changes: Array<(observer: ReactNode) => Promise<void>> = [
        (observer) =>
          render(original, observer, () => {
            store.setState({ isLoading: true });
          }),
        (observer) =>
          render({ ...original, region: { chromosome: "chr2", start: 30, end: 50 } }, observer),
        (observer) => render({ ...original, trackWidth: 200 }, observer),
        (observer) => render({ ...original, marginWidth: 40 }, observer),
        (observer) => render({ ...original, totalHeight: 200 }, observer),
        (observer) =>
          render(original, observer, () => {
            store.getState().setSelectionMode("pan");
          }),
        (observer) =>
          render(original, observer, () => {
            store.getState().setSelectionMode(mode === "zoom" ? "highlight" : "zoom");
          }),
        (observer) =>
          render(original, observer, () => {
            store.getState().setSelectionHighlight({ color: "red", opacity: 0.5, type: "filled" });
          }),
      ];
      for (const change of changes) {
        await changeBlocked(false);
        await changeMode(mode);
        await act(async () => {
          store
            .getState()
            .setSelectionHighlight({ color: "#f59e0b", opacity: 0.25, type: "filled" });
        });
        await render(original);
        await startSelection(30, 80);
        expect(svg!.querySelector("[data-region-selection]")).not.toBeNull();
        observe.mockClear();
        await change(<Observer />);
        expect(observe).toHaveBeenCalledWith(null);
        expect(store.getState().region).toEqual(original.region);
        expect(store.getState().highlights).toEqual([]);
        await render(original);
        expect(svg!.querySelector("[data-region-selection]")).toBeNull();
      }
      expect(mounts).toBe(1);
    },
  );

  it("cancels when the SVG changes", async () => {
    await mount();
    await startSelection(30, 80);
    await render({ region: initialRegion, svg: null });
    expect(svg!.querySelector("[data-region-selection]")).toBeNull();
    await act(async () => {
      document.dispatchEvent(new MouseEvent("pointerup", { clientX: 95 }));
    });
    expect(store.getState().region).toEqual(initialRegion);
  });

  it("cancels a ruler drag when Zoom changes back to Pan", async () => {
    await mount(
      { selectionMode: "pan" },
      { children: <rect data-genomebrowser-selection-mode="zoom" /> },
    );
    await act(async () => {
      svg!
        .querySelector("[data-genomebrowser-selection-mode]")!
        .dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 30 }));
    });
    expect(store.getState().selectionMode).toBe("zoom");
    await changeMode("pan");
    await act(async () => {
      document.dispatchEvent(new MouseEvent("pointerup", { clientX: 95 }));
    });
    expect(store.getState().region).toEqual(initialRegion);
    expect(svg!.querySelector("[data-region-selection]")).toBeNull();
  });

  it("removes every native drag listener on invalidation and unmount", async () => {
    await mount();
    for (const unmount of [false, true]) {
      const added = vi.spyOn(document, "addEventListener");
      const removed = vi.spyOn(document, "removeEventListener");
      const windowAdded = vi.spyOn(window, "addEventListener");
      const windowRemoved = vi.spyOn(window, "removeEventListener");
      await startSelection(30, 80);
      if (unmount) {
        await act(async () => root?.unmount());
        root = undefined;
      } else {
        await render({ region: initialRegion, trackWidth: 200 });
      }
      for (const name of ["pointermove", "pointerup", "pointercancel", "keydown"]) {
        const call = added.mock.calls.find(([type]) => type === name)!;
        expect(removed).toHaveBeenCalledWith(name, call[1]);
      }
      const blur = windowAdded.mock.calls.find(([type]) => type === "blur")!;
      expect(windowRemoved).toHaveBeenCalledWith("blur", blur[1]);
      vi.restoreAllMocks();
      await act(async () => {
        document.dispatchEvent(new MouseEvent("pointerup", { clientX: 95 }));
      });
      expect(store.getState().region).toEqual(initialRegion);
    }
  });
});
