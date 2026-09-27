import {
  createContext,
  use,
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type { GenomicRegion } from "../../genome/region";
import { svgPoint } from "../../modules/utils/svg";
import type { BrowserStoreInstance } from "../state/browserStore";
import type { useContentTransform } from "./useContentTransform";

const PAN_THRESHOLD = 10;
const WHEEL_SETTLE_MS = 120;
const LINE_HEIGHT_PX = 16;

/** Tooltips read the owning browser's live gesture without subscribing to movement. */
export const PanStatusContext = createContext<(() => boolean) | null>(null);

export function usePanDragStatus() {
  const isDragging = use(PanStatusContext);
  if (!isDragging) throw new Error("usePanDragStatus must be used within a GenomeBrowser");
  return isDragging;
}

type PanOptions = {
  svg: SVGSVGElement | null;
  browserStore: BrowserStoreInstance;
  trackWidth: number;
  content: Pick<ReturnType<typeof useContentTransform>, "getContentOffset" | "setContentOffset">;
};

type Drag = {
  target: SVGElement;
  pointerId: number;
  startX: number;
  startingOffset: number;
  appliedOffset: number;
  captured: boolean;
};

export type BrowserPan = {
  isDragging: () => boolean;
  subscribeEnd: (listener: () => void) => () => void;
  onPointerDown: (event: PointerEvent<SVGElement>) => boolean;
  onPointerMove: (event: PointerEvent<SVGElement>) => void;
  onPointerUp: (event: PointerEvent<SVGElement>) => void;
  onPointerCancel: (event: PointerEvent<SVGElement>) => void;
  onLostPointerCapture: (event: PointerEvent<SVGElement>) => void;
  onClickCapture: (event: MouseEvent<SVGElement>) => void;
};

/** Owns browser panning from pointer/wheel input through the genomic region update. */
export function useBrowserPan(options: PanOptions): BrowserPan {
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });

  // One instance keeps handlers stable without rendering on pointer movement.
  const [pan] = useState(() => createPan(latest));

  const { svg, browserStore } = options;
  useEffect(() => {
    // A native non-passive listener allows horizontal gestures to prevent page scrolling.
    svg?.addEventListener("wheel", pan.onWheel, { passive: false });
    svg?.addEventListener("pointerdown", pan.cancelWheel);
    window.addEventListener("blur", pan.interrupt);
    const unsubscribe = browserStore.subscribe(pan.cancelIfDisabled);
    return () => {
      svg?.removeEventListener("wheel", pan.onWheel);
      svg?.removeEventListener("pointerdown", pan.cancelWheel);
      window.removeEventListener("blur", pan.interrupt);
      unsubscribe();
      pan.interrupt();
    };
  }, [svg, browserStore, pan]);

  return pan.handlers;
}

// Private implementation of this browser's interaction. The hook owns its
// lifetime; all event paths share the same drag and wheel state here.
function createPan(latest: { current: PanOptions }) {
  let drag: Drag | null = null;
  let suppressNextClick = false;
  const endListeners = new Set<() => void>();
  let wheelOffset = 0;
  let wheelTimer: ReturnType<typeof setTimeout> | undefined;

  function enabled() {
    const { browserStore, trackWidth } = latest.current;
    const { isLoading } = browserStore.getState();
    return !isLoading && Number.isFinite(trackWidth) && trackWidth > 0;
  }

  function readX(event: PointerEvent<SVGElement>) {
    const { svg } = latest.current;
    return svg ? (svgPoint(svg, event.clientX, event.clientY)?.x ?? null) : null;
  }

  function commitOffset(offset: number) {
    const { browserStore, trackWidth, content } = latest.current;
    const { region, setRegion } = browserStore.getState();
    const candidate = getPanCommitRegion(region, trackWidth, offset);
    if (!candidate || !setRegion(candidate).ok) content.setContentOffset(0);
    // On success, useContentTransform resets the offset with the new region.
  }

  function finish(reason: "release" | "interrupt") {
    const active = drag;
    if (!active) return;
    // Releasing capture can cause lostpointercapture. Detach before it can
    // re-enter termination, so this gesture commits or cancels exactly once.
    drag = null;
    const commit = reason === "release" && Math.abs(active.appliedOffset) >= PAN_THRESHOLD;
    try {
      releaseCapture(active);
    } finally {
      suppressNextClick = commit;
      try {
        if (commit) {
          commitOffset(active.appliedOffset);
        } else {
          // The starting offset only preserves continuity during movement. Zero
          // restores the committed region when temporary movement is discarded.
          latest.current.content.setContentOffset(0);
        }
      } finally {
        for (const listener of endListeners) listener();
      }
    }
  }

  function preview(active: Drag, x: number) {
    const requested = active.startingOffset + x - active.startX;
    active.appliedOffset = latest.current.content.setContentOffset(requested);
    return requested;
  }

  function cancelWheel() {
    if (wheelTimer === undefined) return;
    clearTimeout(wheelTimer);
    wheelTimer = undefined;
    wheelOffset = 0;
    latest.current.content.setContentOffset(0);
  }

  function interrupt() {
    cancelWheel();
    finish("interrupt");
  }

  function onPointerCancel(event: PointerEvent<SVGElement>) {
    if (drag?.pointerId === event.pointerId) finish("interrupt");
  }

  const handlers: BrowserPan = {
    isDragging: () => drag !== null,
    subscribeEnd(listener) {
      endListeners.add(listener);
      return () => {
        endListeners.delete(listener);
      };
    },
    onPointerDown(event) {
      if (!enabled() || drag || !event.isPrimary || event.button !== 0) return false;
      const x = readX(event);
      if (x === null) return false;
      cancelWheel();
      const offset = latest.current.content.getContentOffset();
      drag = {
        target: event.currentTarget,
        pointerId: event.pointerId,
        startX: x,
        startingOffset: offset,
        appliedOffset: offset,
        captured: false,
      };
      return true;
    },
    onPointerMove(event) {
      const active = drag;
      if (!active || active.pointerId !== event.pointerId) return;
      const x = readX(event);
      if (x === null) return;
      if (Math.abs(preview(active, x)) < PAN_THRESHOLD) return;
      event.preventDefault();
      if (active.captured) return;
      try {
        active.target.setPointerCapture(active.pointerId);
        active.captured = true;
      } catch (error) {
        finish("interrupt");
        if (
          !isInactivePointer(error) &&
          !(error instanceof DOMException && error.name === "InvalidStateError")
        )
          throw error;
      }
    },
    onPointerUp(event) {
      const active = drag;
      if (!active || active.pointerId !== event.pointerId) return;
      const x = readX(event);
      if (x !== null) preview(active, x);
      if (Math.abs(active.appliedOffset) >= PAN_THRESHOLD) event.preventDefault();
      finish("release");
    },
    onPointerCancel,
    onLostPointerCapture: onPointerCancel,
    onClickCapture(event) {
      if (!suppressNextClick) return;
      suppressNextClick = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };

  function onWheel(event: WheelEvent) {
    if (
      !enabled() ||
      latest.current.browserStore.getState().selectionMode !== "pan" ||
      drag ||
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      !Number.isFinite(event.deltaX) ||
      event.deltaX === 0 ||
      Math.abs(event.deltaX) <= Math.abs(event.deltaY)
    )
      return;
    const { svg, trackWidth, content } = latest.current;
    if (!svg) return;
    let distance: number;
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      distance = event.deltaX * trackWidth;
    } else {
      const pixels =
        event.deltaX * (event.deltaMode === WheelEvent.DOM_DELTA_LINE ? LINE_HEIGHT_PX : 1);
      const start = svgPoint(svg, event.clientX, event.clientY);
      const end = svgPoint(svg, event.clientX + pixels, event.clientY);
      if (!start || !end) return;
      distance = end.x - start.x;
    }
    if (!Number.isFinite(distance) || distance === 0) return;
    event.preventDefault();
    wheelOffset = content.setContentOffset(wheelOffset - distance);
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {
      const offset = wheelOffset;
      wheelTimer = undefined;
      wheelOffset = 0;
      commitOffset(offset);
    }, WHEEL_SETTLE_MS);
  }

  return {
    handlers,
    onWheel,
    cancelWheel,
    interrupt,
    cancelIfDisabled: () => {
      if (!enabled()) interrupt();
      else if (latest.current.browserStore.getState().selectionMode !== "pan") cancelWheel();
    },
  };
}

function isInactivePointer(error: unknown) {
  return error instanceof DOMException && error.name === "NotFoundError";
}

function releaseCapture(active: Drag) {
  try {
    if (active.target.hasPointerCapture(active.pointerId)) {
      active.target.releasePointerCapture(active.pointerId);
    }
  } catch (error) {
    // An expired pointer needs no release. Unexpected failures still surface;
    // finish's finally block always restores our local gesture state.
    if (!isInactivePointer(error)) throw error;
  }
}
function getPanCommitRegion(
  region: GenomicRegion,
  width: number,
  deltaPx: number,
): GenomicRegion | null {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(deltaPx)) return null;
  const span = region.end - region.start;
  if (!Number.isSafeInteger(span) || span <= 0) return null;
  const rawShiftBases = (deltaPx / width) * span;
  const shiftBases = rawShiftBases < 0 ? Math.ceil(rawShiftBases) : Math.floor(rawShiftBases);
  if (shiftBases === 0) return null;
  const start = region.start - shiftBases;
  const end = region.end - shiftBases;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;

  return {
    chromosome: region.chromosome,
    start,
    end,
  };
}
