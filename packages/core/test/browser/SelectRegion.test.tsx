// @vitest-environment jsdom

import { act, useLayoutEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SelectRegion } from "../../src/browser/viewport/SelectRegion";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import type { GenomicRegion } from "../../src/genome/region";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let svg: SVGSVGElement | undefined;
let root: Root | undefined;
type SelectionTestProps = Pick<Parameters<typeof SelectRegion>[0], "region" | "setRegion"> &
  Partial<
    Pick<
      Parameters<typeof SelectRegion>[0],
      | "disabled"
      | "trackWidth"
      | "marginWidth"
      | "totalHeight"
      | "mode"
      | "onModeChange"
      | "highlightStyle"
      | "onHighlight"
      | "children"
      | "highlights"
    >
  >;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  svg?.remove();
  root = undefined;
  svg = undefined;
});

describe("SelectRegion", () => {
  it("starts shared Zoom from a marked descendant before track panning and survives the mode update", async () => {
    const setRegion = vi.fn();
    const onModeChange = vi.fn();
    const onPan = vi.fn();
    const props: SelectionTestProps = {
      region: { chromosome: "chr1", start: 100, end: 200 },
      setRegion,
      mode: "pan",
      onModeChange,
      children: (
        <g onPointerDown={onPan}>
          <g data-genomebrowser-selection-mode="zoom">
            <rect data-zoom-target="" />
          </g>
        </g>
      ),
    };
    await renderSelection(props);
    await act(async () =>
      svg!
        .querySelector("[data-zoom-target]")!
        .dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 90 })),
    );
    expect(onModeChange).toHaveBeenCalledExactlyOnceWith("zoom");
    expect(onPan).not.toHaveBeenCalled();
    await rerenderSelection({ ...props, mode: "zoom" });
    await act(async () => document.dispatchEvent(new MouseEvent("pointermove", { clientX: 40 })));
    const selection = svg!.querySelector("[data-region-selection]")!;
    expect(selection.getAttribute("height")).toBe("100");
    expect(selection.getAttribute("x")).toBe("40");
    expect(selection.getAttribute("width")).toBe("50");
    await act(async () => document.dispatchEvent(new MouseEvent("pointerup", { clientX: 40 })));
    expect(setRegion).toHaveBeenCalledExactlyOnceWith({ chromosome: "chr1", start: 120, end: 170 });
    expect(svg!.querySelector("[data-region-selection]")).toBeNull();
  });

  it.each([
    { disabled: true, button: 0, clientX: 60 },
    { disabled: false, button: 2, clientX: 60 },
    { disabled: false, button: 0, clientX: 10 },
  ])(
    "does not switch modes for an ineligible marked press: %j",
    async ({ disabled, button, clientX }) => {
      const onModeChange = vi.fn();
      await renderSelection({
        region: { chromosome: "chr1", start: 100, end: 200 },
        setRegion: vi.fn(),
        mode: "pan",
        disabled,
        onModeChange,
        children: <rect data-genomebrowser-selection-mode="zoom" />,
      });
      await act(async () =>
        svg!
          .querySelector("[data-genomebrowser-selection-mode]")!
          .dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button, clientX })),
      );
      expect(onModeChange).not.toHaveBeenCalled();
      expect(svg!.querySelector("[data-region-selection]")).toBeNull();
    },
  );

  it("tracks the guide only on the overlay and removes it in Pan or while blocked", async () => {
    const props = { region: { chromosome: "chr1", start: 0, end: 100 }, setRegion: vi.fn() };
    await renderSelection(props);
    const overlay = svg!.querySelector("[data-selection-overlay]")!;
    const guide = svg!.querySelector<SVGLineElement>("[data-cursor-guide]")!;
    expect(guide.style.visibility).toBe("hidden");
    await act(async () =>
      overlay.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 55 })),
    );
    expect(guide.getAttribute("x1")).toBe("55");
    expect(guide.style.visibility).toBe("visible");
    await act(async () => overlay.dispatchEvent(new MouseEvent("pointerout", { bubbles: true })));
    expect(guide.style.visibility).toBe("hidden");
    await act(async () => document.dispatchEvent(new MouseEvent("pointermove", { clientX: 80 })));
    expect(guide.style.visibility).toBe("hidden");
    for (const change of [{ mode: "pan" as const }, { disabled: true }]) {
      await rerenderSelection({ ...props, ...change });
      expect(svg!.querySelector("[data-selection-overlay]")).toBeNull();
      expect(svg!.querySelector("[data-cursor-guide]")).toBeNull();
    }
  });

  it("preserves margin controls and restores track interactions in Pan", async () => {
    const onTrack = vi.fn();
    const onMargin = vi.fn();
    const props = {
      region: { chromosome: "chr1", start: 0, end: 100 },
      setRegion: vi.fn(),
      children: (
        <g>
          <rect data-margin="" onClick={onMargin} />
          <rect data-track="" onPointerMove={onTrack} />
        </g>
      ),
    };
    await renderSelection(props);
    await act(async () =>
      svg!
        .querySelector("[data-margin]")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    expect(onMargin).toHaveBeenCalledOnce();
    const contextMenu = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    await act(async () =>
      svg!.querySelector("[data-selection-overlay]")!.dispatchEvent(contextMenu),
    );
    expect(contextMenu.defaultPrevented).toBe(true);
    await rerenderSelection({ ...props, mode: "pan" });
    expect(svg!.querySelector("[data-selection-overlay]")).toBeNull();
    await act(async () =>
      svg!
        .querySelector("[data-track]")!
        .dispatchEvent(new MouseEvent("pointermove", { bubbles: true })),
    );
    expect(onTrack).toHaveBeenCalledOnce();
  });

  it.each(["zoom", "highlight"] as const)(
    "covers track content and handles %s selections without invoking tracks",
    async (mode) => {
      const region = { chromosome: "chr1", start: 100, end: 200 };
      const setRegion = vi.fn();
      const onHighlight = vi.fn();
      const onHover = vi.fn();
      const onPointerDown = vi.fn();
      const onClick = vi.fn();
      await renderSelection({
        region,
        setRegion,
        mode,
        onHighlight,
        children: (
          <rect
            data-track-content=""
            onPointerMove={onHover}
            onPointerDown={onPointerDown}
            onClick={onClick}
          />
        ),
      });
      const content = svg!.querySelector("[data-track-content]")!;
      const target = svg!.querySelector("[data-selection-overlay]")!;
      expect(
        content.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(target.getAttribute("x")).toBe("20");
      expect(target.getAttribute("width")).toBe("100");
      expect((target as SVGElement).style.cursor).toBe("crosshair");
      await act(async () => {
        target.dispatchEvent(new MouseEvent("pointermove", { bubbles: true }));
        target.dispatchEvent(
          new MouseEvent("pointerdown", {
            bubbles: true,
            clientX: 30,
            button: 0,
          }),
        );
        document.dispatchEvent(new MouseEvent("pointerup", { clientX: 80 }));
        target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(onHover).not.toHaveBeenCalled();
      expect(onPointerDown).not.toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
      if (mode === "zoom") {
        expect(setRegion).toHaveBeenCalledWith({ chromosome: "chr1", start: 110, end: 160 });
        expect(onHighlight).not.toHaveBeenCalled();
      } else {
        expect(onHighlight).toHaveBeenCalledWith(
          expect.objectContaining({
            region: { chromosome: "chr1", start: 110, end: 160 },
          }),
        );
        expect(setRegion).not.toHaveBeenCalled();
      }
    },
  );

  it.each(["zoom", "highlight"] as const)(
    "cancels %s with Escape without committing and allows the next selection",
    async (mode) => {
      const region = { chromosome: "chr1", start: 100, end: 200 };
      const store = createBrowserStore({
        assembly: { id: "test", chromosomes: { chr1: 1_000 } },
        region,
        selectionMode: mode,
        highlights: [{ id: "existing", region, color: "#ff0000" }],
      });
      const before = store.getState();
      const onHighlight = vi.fn();
      await renderSelection({ region, setRegion: before.setRegion, mode, onHighlight });

      await startSelection(30, 80);
      expect(svg?.querySelector("[data-region-selection]")).not.toBeNull();
      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });
      expect(svg?.querySelector("[data-region-selection]")).toBeNull();
      await act(async () => {
        document.dispatchEvent(new MouseEvent("pointermove", { clientX: 95 }));
        document.dispatchEvent(new MouseEvent("pointerup", { clientX: 95 }));
      });
      expect(store.getState()).toBe(before);
      expect(onHighlight).not.toHaveBeenCalled();

      const idleEscape = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
      await act(async () => document.dispatchEvent(idleEscape));
      expect(idleEscape.defaultPrevented).toBe(false);
      expect(store.getState()).toBe(before);

      await dragSelection(45, 95);
      if (mode === "zoom") {
        expect(store.getState().region).toEqual({ chromosome: "chr1", start: 125, end: 175 });
        expect(onHighlight).not.toHaveBeenCalled();
      } else {
        expect(store.getState().region).toBe(before.region);
        expect(onHighlight).toHaveBeenCalledOnce();
        expect(onHighlight).toHaveBeenCalledWith(
          expect.objectContaining({
            region: { chromosome: "chr1", start: 125, end: 175 },
          }),
        );
      }
      expect(store.getState().selectionMode).toBe(mode);
      expect(store.getState().highlights).toBe(before.highlights);
      expect(svg?.querySelector("[data-region-selection]")).toBeNull();
    },
  );

  it("leaves keyboard events and modifier drags to the application", async () => {
    const setRegion = vi.fn();
    const onHighlight = vi.fn();
    await renderSelection({
      region: { chromosome: "chr1", start: 0, end: 100 },
      setRegion,
      mode: "pan",
      onHighlight,
    });
    for (const key of ["p", "z", "h", "Escape"]) {
      const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      await act(async () => {
        svg!.dispatchEvent(event);
      });
      expect(event.defaultPrevented).toBe(false);
    }
    for (const altKey of [false, true]) {
      await act(async () => {
        svg!.querySelector("rect")!.dispatchEvent(
          new MouseEvent("pointerdown", {
            bubbles: true,
            button: 0,
            clientX: 30,
            shiftKey: true,
            altKey,
          }),
        );
        document.dispatchEvent(new MouseEvent("pointerup", { clientX: 80 }));
      });
    }
    expect(setRegion).not.toHaveBeenCalled();
    expect(onHighlight).not.toHaveBeenCalled();
  });

  it("creates chromosome-scoped highlights with the configured style without zooming", async () => {
    const setRegion = vi.fn();
    const onHighlight = vi.fn();
    await renderSelection({
      region: { chromosome: "chr1", start: 100, end: 200 },
      setRegion,
      mode: "highlight",
      onHighlight,
      highlightStyle: { color: "#ff0000", opacity: 0.7, type: "outlined" },
    });
    await dragSelection(95, 45);
    expect(setRegion).not.toHaveBeenCalled();
    expect(onHighlight).toHaveBeenCalledWith({
      id: "chr1:125-175",
      region: { chromosome: "chr1", start: 125, end: 175 },
      color: "#ff0000",
      opacity: 0.7,
      type: "outlined",
    });
  });
  it("keeps repeated selections distinct from existing region IDs", async () => {
    const onHighlight = vi.fn();
    const region = { chromosome: "chr1", start: 100, end: 200 };
    await renderSelection({
      region,
      setRegion: vi.fn(),
      mode: "highlight",
      onHighlight,
      highlights: ["chr1:125-175", "chr1:125-175 (2)"].map((id) => ({
        id,
        region,
        color: "#ff0000",
      })),
    });
    await dragSelection(45, 95);
    expect(onHighlight).toHaveBeenCalledWith(expect.objectContaining({ id: "chr1:125-175 (3)" }));
  });

  it.each(["pointercancel", "blur"])("cancels on %s", async (action) => {
    const setRegion = vi.fn();
    await renderSelection({ region: { chromosome: "chr1", start: 100, end: 200 }, setRegion });
    await startSelection(30, 80);
    await act(async () => {
      if (action === "blur") window.dispatchEvent(new Event("blur"));
      else document.dispatchEvent(new MouseEvent(action));
      document.dispatchEvent(new MouseEvent("pointerup", { clientX: 80 }));
    });
    expect(setRegion).not.toHaveBeenCalled();
  });
  it("leaves plain drags to pan mode and rejects margin and right-button starts", async () => {
    const setRegion = vi.fn();
    await renderSelection({
      region: { chromosome: "chr1", start: 0, end: 100 },
      setRegion,
      mode: "pan",
    });
    await dragSelection(30, 80);
    expect(setRegion).not.toHaveBeenCalled();
    await rerenderSelection({ region: { chromosome: "chr1", start: 0, end: 100 }, setRegion });
    await dragSelection(10, 80);
    expect(setRegion).not.toHaveBeenCalled();
  });

  it("preserves ordinary selection behavior away from chromosome boundaries", async () => {
    const region = { chromosome: "chr1", start: 100, end: 200 };
    const store = createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 1_000 } },
      region,
    });
    await renderSelection({ region, setRegion: store.getState().setRegion });

    await dragSelection(45, 95);

    expect(store.getState().region).toEqual({ chromosome: "chr1", start: 125, end: 175 });
  });

  it.each([
    ["lower", 20, 70, { chromosome: "chr1", start: 0, end: 50 }],
    ["upper", 70, 150, { chromosome: "chr1", start: 50, end: 100 }],
  ] as const)(
    "commits a selection clamped to the %s viewport and chromosome boundary",
    async (_edge, startX, endX, expected) => {
      const region = { chromosome: "chr1", start: 0, end: 100 };
      const store = createBrowserStore({
        assembly: { id: "test", chromosomes: { chr1: 100 } },
        region,
      });
      await renderSelection({ region, setRegion: store.getState().setRegion });

      await dragSelection(startX, endX);

      expect(store.getState().region).toEqual(expected);
    },
  );

  it("keeps a selection at base resolution nonempty", async () => {
    const region = { chromosome: "chr1", start: 0, end: 1 };
    const store = createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 100 } },
      region,
    });
    const before = store.getState();
    await renderSelection({ region, setRegion: store.getState().setRegion });

    await dragSelection(20, 30);

    expect(store.getState().region).toEqual(before.region);
    expect(store.getState().region).toEqual(region);
    expect(svg?.querySelector("[data-region-selection]")).toBeNull();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "does not begin or commit a selection with invalid track width %s",
    async (trackWidth) => {
      const setRegion = vi.fn((_region: GenomicRegion) => ({
        ok: false as const,
        code: "INVALID_COORDINATE" as const,
        error: "not committed",
      }));
      await renderSelection({
        region: { chromosome: "chr1", start: 20, end: 40 },
        trackWidth,
        setRegion,
      });

      await dragSelection(20, 80);

      expect(setRegion).not.toHaveBeenCalled();
      expect(svg?.querySelector("[data-region-selection]")).toBeNull();
    },
  );

  it.each([
    ["margin width", { marginWidth: 0 }],
    ["non-finite margin width", { marginWidth: Number.NaN }],
    ["total height", { totalHeight: 0 }],
    ["non-finite total height", { totalHeight: Number.POSITIVE_INFINITY }],
  ] as const)("does not commit a selection with invalid %s", async (_name, dimensions) => {
    const setRegion = vi.fn((_region: GenomicRegion) => ({
      ok: false as const,
      code: "INVALID_COORDINATE" as const,
      error: "not committed",
    }));
    await renderSelection({
      region: { chromosome: "chr1", start: 20, end: 40 },
      setRegion,
      ...dimensions,
    });

    await dragSelection(20, 80);

    expect(setRegion).not.toHaveBeenCalled();
  });

  it.each(["zoom", "highlight"] as const)(
    "invalidates %s before layout observers or native input can use changed props",
    async (mode) => {
      const changes: Partial<SelectionTestProps>[] = [
        { disabled: true },
        { region: { chromosome: "chr2", start: 30, end: 50 } },
        { trackWidth: 200 },
        { marginWidth: 40 },
        { totalHeight: 200 },
        { mode: "pan" },
        { mode: mode === "zoom" ? "highlight" : "zoom" },
        { highlightStyle: { color: "red", opacity: 0.5, type: "filled" } },
      ];
      const setRegion = vi.fn();
      const onHighlight = vi.fn();
      const props = {
        region: { chromosome: "chr1", start: 20, end: 40 },
        setRegion,
        onHighlight,
        mode,
      };
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
      await renderSelection({ ...props, children: <Child /> });
      for (const change of changes) {
        await rerenderSelection({ ...props, children: <Child /> });
        await startSelection(30, 80);
        expect(svg?.querySelector("[data-region-selection]")).not.toBeNull();
        observe.mockClear();
        // A sibling layout effect sees this commit before passive cleanup runs.
        await rerenderSelection({ ...props, ...change, children: <Child /> }, <Observer />);
        expect(observe).toHaveBeenCalledWith(null);
        expect(setRegion).not.toHaveBeenCalled();
        expect(onHighlight).not.toHaveBeenCalled();
        await rerenderSelection({ ...props, children: <Child /> });
        expect(svg?.querySelector("[data-region-selection]")).toBeNull();
      }
      expect(mounts).toBe(1);
    },
  );

  it("cancels when the SVG changes", async () => {
    const props = { region: { chromosome: "chr1", start: 0, end: 100 }, setRegion: vi.fn() };
    await renderSelection(props);
    await startSelection(30, 80);
    await act(async () =>
      root?.render(
        <SelectRegion {...props} svg={null} marginWidth={20} trackWidth={100} totalHeight={100} />,
      ),
    );
    expect(svg?.querySelector("[data-region-selection]")).toBeNull();
    await act(async () => document.dispatchEvent(new MouseEvent("pointerup", { clientX: 95 })));
    expect(props.setRegion).not.toHaveBeenCalled();
  });

  it("cancels a ruler drag when Zoom changes back to Pan", async () => {
    const props: SelectionTestProps = {
      region: { chromosome: "chr1", start: 0, end: 100 },
      setRegion: vi.fn(),
      mode: "pan",
      onModeChange: vi.fn(),
      children: <rect data-genomebrowser-selection-mode="zoom" />,
    };
    await renderSelection(props);
    await act(async () =>
      svg!
        .querySelector("[data-genomebrowser-selection-mode]")!
        .dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 30 })),
    );
    await rerenderSelection({ ...props, mode: "zoom" });
    await rerenderSelection(props);
    await act(async () => document.dispatchEvent(new MouseEvent("pointerup", { clientX: 95 })));
    expect(props.setRegion).not.toHaveBeenCalled();
    expect(svg?.querySelector("[data-region-selection]")).toBeNull();
  });

  it("removes every native drag listener on invalidation and unmount", async () => {
    const props = { region: { chromosome: "chr1", start: 0, end: 100 }, setRegion: vi.fn() };
    await renderSelection(props);
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
        await rerenderSelection({ ...props, trackWidth: 200 });
      }
      for (const name of ["pointermove", "pointerup", "pointercancel", "keydown"]) {
        const call = added.mock.calls.find(([type]) => type === name)!;
        expect(removed).toHaveBeenCalledWith(name, call[1]);
      }
      const blur = windowAdded.mock.calls.find(([type]) => type === "blur")!;
      expect(windowRemoved).toHaveBeenCalledWith("blur", blur[1]);
      vi.restoreAllMocks();
      await act(async () => document.dispatchEvent(new MouseEvent("pointerup", { clientX: 95 })));
      expect(props.setRegion).not.toHaveBeenCalled();
    }
  });
});

async function renderSelection(props: SelectionTestProps) {
  svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const point = {
    x: 0,
    y: 0,
    matrixTransform: () => ({ x: point.x, y: point.y }),
  };
  Object.assign(svg, {
    createSVGPoint: () => point,
    getScreenCTM: () => ({ inverse: () => ({}) }),
  });
  document.body.appendChild(svg);
  root = createRoot(svg);
  await rerenderSelection(props);
}

async function rerenderSelection(
  {
    region,
    setRegion,
    trackWidth = 100,
    marginWidth = 20,
    totalHeight = 100,
    disabled = false,
    ...options
  }: SelectionTestProps,
  observer?: React.ReactNode,
) {
  await act(async () =>
    root?.render(
      <>
        <SelectRegion
          {...options}
          svg={svg!}
          marginWidth={marginWidth}
          trackWidth={trackWidth}
          totalHeight={totalHeight}
          region={region}
          setRegion={setRegion}
          disabled={disabled}
        />
        {observer}
      </>,
    ),
  );
}

async function startSelection(startX: number, endX: number) {
  const hitArea = svg?.querySelector("[data-selection-overlay]") ?? svg?.querySelector("rect");
  if (!hitArea) throw new Error("Expected selection hit area");

  await act(async () => {
    hitArea.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: startX, clientY: 0 }),
    );
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: endX, clientY: 0 }));
  });
}

async function dragSelection(startX: number, endX: number) {
  await startSelection(startX, endX);
  await act(async () => document.dispatchEvent(new MouseEvent("pointerup", { clientX: endX })));
}
