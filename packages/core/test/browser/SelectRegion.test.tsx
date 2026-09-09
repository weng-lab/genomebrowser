// @vitest-environment jsdom

import { act } from "react";
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
      | "highlightStyle"
      | "onHighlight"
    >
  >;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  svg?.remove();
  root = undefined;
  svg = undefined;
});

describe("SelectRegion", () => {
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
      id: expect.any(String),
      region: { chromosome: "chr1", start: 125, end: 175 },
      color: "#ff0000",
      opacity: 0.7,
      type: "outlined",
    });
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

  it.each([
    ["interaction gate", { disabled: true }],
    ["region", { region: { chromosome: "chr1", start: 30, end: 50 } }],
    ["track width", { trackWidth: 200 }],
    ["margin width", { marginWidth: 40 }],
    ["total height", { totalHeight: 200 }],
  ] as const)("cancels an active drag when the %s changes", async (_name, changedProps) => {
    const setRegion = vi.fn((_region: GenomicRegion) => ({
      ok: true as const,
      region: _region,
      clamped: false,
    }));
    const initialProps = {
      region: { chromosome: "chr1", start: 20, end: 40 },
      setRegion,
    };
    await renderSelection(initialProps);
    await startSelection(30, 80);
    expect(svg?.querySelector("[data-region-selection]")).not.toBeNull();

    await rerenderSelection({ ...initialProps, ...changedProps });
    await act(async () => document.dispatchEvent(new MouseEvent("pointerup", { clientX: 95 })));

    expect(setRegion).not.toHaveBeenCalled();
    expect(svg?.querySelector("[data-region-selection]")).toBeNull();
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

async function rerenderSelection({
  region,
  setRegion,
  trackWidth = 100,
  marginWidth = 20,
  totalHeight = 100,
  disabled = false,
  ...options
}: SelectionTestProps) {
  await act(async () =>
    root?.render(
      <SelectRegion
        {...options}
        svg={svg!}
        marginWidth={marginWidth}
        trackWidth={trackWidth}
        totalHeight={totalHeight}
        region={region}
        setRegion={setRegion}
        disabled={disabled}
      />,
    ),
  );
}

async function startSelection(startX: number, endX: number) {
  const hitArea = svg?.querySelector("rect");
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
