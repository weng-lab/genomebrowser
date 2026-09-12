// @vitest-environment jsdom

import { act, type PointerEvent as ReactPointerEvent } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  expandRegion,
  getPanCommitRegion,
  usePanController,
} from "../../src/browser/viewport/usePanController";
import { usePanWheel } from "../../src/browser/viewport/usePanWheel";
import { createBrowserStore } from "../../src/browser/state/browserStore";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let controller: ReturnType<typeof usePanController> | undefined;

type HarnessProps = Parameters<typeof usePanController>[0] & { wheelEnabled?: boolean };

function Harness(props: HarnessProps) {
  controller = usePanController(props);
  usePanWheel({
    svg: props.svg,
    disabled: !props.wheelEnabled || controller.isPanLocked,
    trackWidth: props.trackWidth,
    isDragging: controller.panDrag.isDragging,
    setContentOffset: props.setContentOffset,
    onCommit: controller.commitPan,
  });
  return null;
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  vi.useRealTimers();
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

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid pan width %s before coordinate math",
    (width) => {
      expect(
        getPanCommitRegion({ chromosome: "chr1", start: 100, end: 200 }, width, 25),
      ).toBeNull();
    },
  );

  it("rejects a non-finite pan delta before coordinate math", () => {
    expect(
      getPanCommitRegion(
        { chromosome: "chr1", start: 100, end: 200 },
        100,
        Number.POSITIVE_INFINITY,
      ),
    ).toBeNull();
  });

  it.each([20, -20])("rejects pan delta %s when it cannot move by one base", (deltaPx) => {
    expect(
      getPanCommitRegion({ chromosome: "chr1", start: 100, end: 101 }, 1_000, deltaPx),
    ).toBeNull();
  });
});

describe("usePanController", () => {
  it("commits an active drag against the latest region and width, then locks panning", async () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    let contentOffset = 0;
    let capturedPointerId: number | undefined;
    const setRegion = vi.fn((region) => ({ ok: true, region, clamped: false }) as const);
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
    expect(contentOffset).toBe(0);
    expect(controller?.isPanLocked).toBe(true);
    expect(controller?.panDrag.onPointerDown(pointerEvent(40))).toBe(false);
    expect(onPanStart).toHaveBeenCalledOnce();
  });

  it.each([
    [
      "lower",
      { chromosome: "chr1", start: 0, end: 40 },
      25,
      { chromosome: "chr1", start: 0, end: 30 },
    ],
    [
      "upper",
      { chromosome: "chr1", start: 60, end: 100 },
      -25,
      { chromosome: "chr1", start: 70, end: 100 },
    ],
  ] as const)(
    "normalizes a pan against the %s chromosome boundary",
    async (_edge, region, deltaPx, expected) => {
      const store = createBrowserStore({
        assembly: { id: "test", chromosomes: { chr1: 100 } },
        region,
        trackWidth: 100,
      });
      const interaction = createPanInteraction();

      await renderController({
        svg: interaction.svg,
        region,
        trackWidth: 100,
        getContentOffset: interaction.getContentOffset,
        setContentOffset: interaction.setContentOffset,
        setRegion: store.getState().setRegion,
        onPanStart: vi.fn(),
      });

      expect(controller?.panDrag.onPointerDown(interaction.pointerEvent(50))).toBe(true);
      controller?.panDrag.onPointerMove(interaction.pointerEvent(50 + deltaPx));
      await act(async () =>
        controller?.panDrag.onPointerUp(interaction.pointerEvent(50 + deltaPx)),
      );

      expect(store.getState().region).toEqual(expected);
      expect(interaction.getContentOffset()).toBe(0);
      expect(controller?.isPanLocked).toBe(true);
    },
  );

  it("unlocks and restores the content offset when the normalized pan is rejected", async () => {
    const region = { chromosome: "chr1", start: 20, end: 40 };
    const store = createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 100 } },
      region,
      trackWidth: 100,
    });
    const before = store.getState();
    const interaction = createPanInteraction();

    await renderController({
      svg: interaction.svg,
      region,
      trackWidth: 100,
      getContentOffset: interaction.getContentOffset,
      setContentOffset: interaction.setContentOffset,
      setRegion: store.getState().setRegion,
      onPanStart: vi.fn(),
    });

    expect(controller?.panDrag.onPointerDown(interaction.pointerEvent(500))).toBe(true);
    controller?.panDrag.onPointerMove(interaction.pointerEvent(0));
    await act(async () => controller?.panDrag.onPointerUp(interaction.pointerEvent(0)));

    expect(store.getState()).toBe(before);
    expect(interaction.getContentOffset()).toBe(0);
    expect(controller?.isPanLocked).toBe(false);
  });

  it.each([20, -20])(
    "restores the content offset without committing or locking for sub-base pan %s",
    async (deltaPx) => {
      const interaction = createPanInteraction();
      const setRegion = vi.fn();

      await renderController({
        svg: interaction.svg,
        region: { chromosome: "chr1", start: 20, end: 21 },
        trackWidth: 1_000,
        getContentOffset: interaction.getContentOffset,
        setContentOffset: interaction.setContentOffset,
        setRegion,
        onPanStart: vi.fn(),
      });

      expect(controller?.panDrag.onPointerDown(interaction.pointerEvent(50))).toBe(true);
      controller?.panDrag.onPointerMove(interaction.pointerEvent(50 + deltaPx));
      expect(interaction.getContentOffset()).toBe(deltaPx);
      await act(async () =>
        controller?.panDrag.onPointerUp(interaction.pointerEvent(50 + deltaPx)),
      );

      expect(setRegion).not.toHaveBeenCalled();
      expect(interaction.getContentOffset()).toBe(0);
      expect(controller?.isPanLocked).toBe(false);
    },
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "does not begin or commit a pan with invalid track width %s",
    async (trackWidth) => {
      const interaction = createPanInteraction();
      const setRegion = vi.fn();
      const onPanStart = vi.fn();

      await renderController({
        svg: interaction.svg,
        region: { chromosome: "chr1", start: 20, end: 40 },
        trackWidth,
        getContentOffset: interaction.getContentOffset,
        setContentOffset: interaction.setContentOffset,
        setRegion,
        onPanStart,
      });

      expect(controller?.panDrag.onPointerDown(interaction.pointerEvent(20))).toBe(false);
      expect(setRegion).not.toHaveBeenCalled();
      expect(onPanStart).not.toHaveBeenCalled();
    },
  );
});

function createPanInteraction() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  let contentOffset = 0;
  let capturedPointerId: number | undefined;
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
  const pointerEvent = (clientX: number) => {
    point.x = clientX;
    return {
      button: 0,
      clientX,
      clientY: 0,
      currentTarget: svg,
      isPrimary: true,
      pointerId: 1,
      preventDefault: vi.fn(),
    } as unknown as ReactPointerEvent<SVGElement>;
  };

  return {
    svg,
    pointerEvent,
    getContentOffset: () => contentOffset,
    setContentOffset: (deltaPx: number) => {
      contentOffset = deltaPx;
    },
  };
}

async function renderController(props: HarnessProps) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root?.render(<Harness {...props} />));
}

describe("horizontal wheel panning", () => {
  it.each([
    [25, 0, 125, 225],
    [-25, 0, 75, 175],
    [1, 1, 116, 216],
    [1, 2, 200, 300],
  ])(
    "pans delta %s in mode %s after the gesture settles",
    async (deltaX, deltaMode, start, end) => {
      const { svg, getContentOffset, setContentOffset } = createPanInteraction();
      const setRegion = vi.fn((region) => ({ ok: true, region, clamped: false }) as const);
      vi.useFakeTimers();
      await renderController({
        svg,
        region: { chromosome: "chr1", start: 100, end: 200 },
        trackWidth: 100,
        getContentOffset,
        setContentOffset,
        setRegion,
        onPanStart: vi.fn(),
        wheelEnabled: true,
      });
      const event = new WheelEvent("wheel", { deltaX, deltaMode, cancelable: true });
      svg.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(getContentOffset()).toBe(100 - start);
      expect(setRegion).not.toHaveBeenCalled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(120);
      });
      expect(setRegion).toHaveBeenCalledExactlyOnceWith({ chromosome: "chr1", start, end });
      expect(getContentOffset()).toBe(0);
      expect(controller?.isPanLocked).toBe(true);
    },
  );

  it("accumulates small wheel events and restarts the settle delay", async () => {
    const interaction = createPanInteraction();
    const setRegion = vi.fn((region) => ({ ok: true, region, clamped: false }) as const);
    vi.useFakeTimers();
    await renderController({
      ...interaction,
      region: { chromosome: "chr1", start: 100, end: 110 },
      trackWidth: 100,
      setRegion,
      onPanStart: vi.fn(),
      wheelEnabled: true,
    });
    for (let i = 0; i < 10; i++) {
      interaction.svg.dispatchEvent(new WheelEvent("wheel", { deltaX: 1.5, cancelable: true }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20);
      });
    }
    expect(interaction.getContentOffset()).toBe(-15);
    expect(setRegion).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120);
    });
    expect(setRegion).toHaveBeenCalledExactlyOnceWith({ chromosome: "chr1", start: 101, end: 111 });
  });

  it.each([
    { deltaX: 0, deltaY: 50 },
    { deltaX: 3, deltaY: 50 },
    { deltaX: 50, ctrlKey: true },
    { deltaX: 50, metaKey: true },
    { deltaX: 50, altKey: true },
  ])("leaves scrolling and modified gestures untouched: %o", async (init) => {
    const interaction = createPanInteraction();
    const setRegion = vi.fn();
    vi.useFakeTimers();
    await renderController({
      ...interaction,
      region: { chromosome: "chr1", start: 100, end: 200 },
      trackWidth: 100,
      setRegion,
      onPanStart: vi.fn(),
      wheelEnabled: true,
    });
    const event = new WheelEvent("wheel", { ...init, cancelable: true });
    interaction.svg.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(setRegion).not.toHaveBeenCalled();
    expect(interaction.getContentOffset()).toBe(0);
  });

  it("clears a pending gesture on unmount without committing", async () => {
    const interaction = createPanInteraction();
    const setRegion = vi.fn();
    vi.useFakeTimers();
    await renderController({
      ...interaction,
      region: { chromosome: "chr1", start: 100, end: 200 },
      trackWidth: 100,
      setRegion,
      onPanStart: vi.fn(),
      wheelEnabled: true,
    });
    interaction.svg.dispatchEvent(new WheelEvent("wheel", { deltaX: 25 }));
    expect(vi.getTimerCount()).toBe(1);
    await act(async () => root?.unmount());
    root = undefined;
    expect(vi.getTimerCount()).toBe(0);
    expect(interaction.getContentOffset()).toBe(0);
    const event = new WheelEvent("wheel", { deltaX: 25, cancelable: true });
    interaction.svg.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(setRegion).not.toHaveBeenCalled();
  });

  it("cancels an unfinished gesture when wheel panning becomes disabled", async () => {
    const interaction = createPanInteraction();
    const setRegion = vi.fn();
    const props = {
      ...interaction,
      region: { chromosome: "chr1", start: 100, end: 200 },
      trackWidth: 100,
      setRegion,
      onPanStart: vi.fn(),
      wheelEnabled: true,
    };
    vi.useFakeTimers();
    await renderController(props);
    interaction.svg.dispatchEvent(new WheelEvent("wheel", { deltaX: 25 }));
    expect(interaction.getContentOffset()).toBe(-25);
    await act(async () => root?.render(<Harness {...props} wheelEnabled={false} />));
    const event = new WheelEvent("wheel", { deltaX: 25, cancelable: true });
    interaction.svg.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(setRegion).not.toHaveBeenCalled();
    expect(interaction.getContentOffset()).toBe(0);
  });
});
