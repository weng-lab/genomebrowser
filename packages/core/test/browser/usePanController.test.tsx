// @vitest-environment jsdom

import { act, type PointerEvent as ReactPointerEvent } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  expandRegion,
  getPanCommitRegion,
  usePanController,
} from "../../src/browser/viewport/usePanController";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let controller: ReturnType<typeof usePanController> | undefined;

function Harness(props: Parameters<typeof usePanController>[0]) {
  controller = usePanController(props);
  return null;
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  controller = undefined;
  root = undefined;
});

describe("pan region math", () => {
  it("expands a region evenly around the visible span", () => {
    expect(expandRegion({ chromosome: "chr1", start: 100, end: 200 }, 3)).toEqual({
      chromosome: "chr1",
      start: 0,
      end: 300,
    });
  });

  it("commits a positive pan delta by shifting the region left", () => {
    expect(getPanCommitRegion({ chromosome: "chr1", start: 100, end: 200 }, 100, 25)).toEqual({
      chromosome: "chr1",
      start: 75,
      end: 175,
    });
  });

  it("commits a negative pan delta by shifting the region right", () => {
    expect(getPanCommitRegion({ chromosome: "chr1", start: 100, end: 200 }, 100, -25)).toEqual({
      chromosome: "chr1",
      start: 125,
      end: 225,
    });
  });
});

describe("usePanController", () => {
  it("commits an active drag against the latest region and width, then locks panning", async () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    let contentOffset = 0;
    let capturedPointerId: number | undefined;
    const setRegion = vi.fn();
    const onPanStart = vi.fn();
    const point = {
      x: 0,
      y: 0,
      matrixTransform: () => ({ x: point.x, y: point.y }),
    };
    Object.assign(svg, {
      createSVGPoint: () => point,
      getScreenCTM: () => ({ inverse: () => ({}) }),
      hasPointerCapture: (pointerId: number) => capturedPointerId === pointerId,
      releasePointerCapture: () => {
        capturedPointerId = undefined;
      },
      setPointerCapture: (pointerId: number) => {
        capturedPointerId = pointerId;
      },
    });
    const pointerEvent = (clientX: number) =>
      ({
        button: 0,
        clientX,
        clientY: 0,
        currentTarget: svg,
        isPrimary: true,
        pointerId: 1,
        preventDefault: vi.fn(),
      }) as unknown as ReactPointerEvent<SVGElement>;
    const getContentOffset = () => contentOffset;
    const setContentOffset = (deltaPx: number) => {
      contentOffset = deltaPx;
    };

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () =>
      root?.render(
        <Harness
          svg={svg}
          region={{ chromosome: "chr1", start: 100, end: 200 }}
          trackWidth={100}
          getContentOffset={getContentOffset}
          setContentOffset={setContentOffset}
          setRegion={setRegion}
          onPanStart={onPanStart}
        />,
      ),
    );

    expect(controller?.panDrag.onPointerDown(pointerEvent(10))).toBe(true);
    expect(controller?.panDrag.isDragging()).toBe(true);
    expect(onPanStart).toHaveBeenCalledOnce();
    controller?.panDrag.onPointerMove(pointerEvent(30));
    expect(contentOffset).toBe(20);

    await act(async () =>
      root?.render(
        <Harness
          svg={svg}
          region={{ chromosome: "chr1", start: 1_000, end: 1_400 }}
          trackWidth={200}
          getContentOffset={getContentOffset}
          setContentOffset={setContentOffset}
          setRegion={setRegion}
          onPanStart={onPanStart}
        />,
      ),
    );

    await act(async () => controller?.panDrag.onPointerUp(pointerEvent(30)));

    expect(setRegion).toHaveBeenCalledWith({
      chromosome: "chr1",
      start: 960,
      end: 1_360,
    });
    expect(controller?.isPanLocked).toBe(true);
    expect(controller?.panDrag.onPointerDown(pointerEvent(40))).toBe(false);
    expect(onPanStart).toHaveBeenCalledOnce();
  });
});
