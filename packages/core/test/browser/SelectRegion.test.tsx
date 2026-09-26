// @vitest-environment jsdom

import { act, useLayoutEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SelectRegion } from "../../src/browser/viewport/SelectRegion";

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

// Browser gestures and layout live in tests/browser/scenarios/core-selection.spec.ts.
// Cancellation must prevent a stale region/highlight commit, even when native input
// arrives from a sibling layout effect before passive cleanup. This timing needs a
// direct component test; geometry and ordinary gestures belong in the browser suite.
describe("selection cancellation", () => {
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
