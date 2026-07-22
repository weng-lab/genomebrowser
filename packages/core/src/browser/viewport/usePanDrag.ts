import { useCallback, useRef, type MouseEvent, type PointerEvent } from "react";
import { svgPoint } from "../../modules/utils/svg";

const PAN_COMMIT_THRESHOLD_PX = 10;

export type PanDragHandlers = {
  isDragging: () => boolean;
  onPointerDown: (event: PointerEvent<SVGElement>) => boolean;
  onPointerMove: (event: PointerEvent<SVGElement>) => void;
  onPointerUp: (event: PointerEvent<SVGElement>) => void;
  onPointerCancel: (event: PointerEvent<SVGElement>) => void;
  onClickCapture: (event: MouseEvent<SVGElement>) => void;
};

type UsePanDragOptions = {
  disabled: boolean;
  svg: SVGSVGElement | null;
  getCurrentDelta: () => number;
  setDelta: (deltaPx: number) => void;
  onStart: () => void;
  onCommit: (deltaPx: number) => void;
  onCancel: () => void;
};

export function usePanDrag({
  disabled,
  svg,
  getCurrentDelta,
  setDelta,
  onStart,
  onCommit,
  onCancel,
}: UsePanDragOptions): PanDragHandlers {
  const isDraggingRef = useRef(false);
  const activePointerId = useRef<number | null>(null);
  const capturedPointerId = useRef<number | null>(null);
  const startSvgX = useRef(0);
  const startDeltaPx = useRef(0);
  const suppressNextClick = useRef(false);

  const getEventX = useCallback(
    (event: PointerEvent<SVGElement>) => {
      if (!svg) return null;
      return svgPoint(svg, event.clientX, event.clientY)?.x ?? null;
    },
    [svg],
  );

  const releasePointer = useCallback((event: PointerEvent<SVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (capturedPointerId.current === event.pointerId) capturedPointerId.current = null;
  }, []);

  const resetPointer = useCallback(() => {
    activePointerId.current = null;
    capturedPointerId.current = null;
    isDraggingRef.current = false;
  }, []);

  const capturePointer = useCallback((event: PointerEvent<SVGElement>) => {
    if (capturedPointerId.current === event.pointerId) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    capturedPointerId.current = event.pointerId;
  }, []);

  const onPointerDown = useCallback(
    (event: PointerEvent<SVGElement>) => {
      if (disabled || !event.isPrimary || event.button !== 0) return false;
      const x = getEventX(event);
      if (x === null) return false;

      activePointerId.current = event.pointerId;
      startSvgX.current = x;
      startDeltaPx.current = getCurrentDelta();
      isDraggingRef.current = true;
      onStart();
      return true;
    },
    [disabled, getCurrentDelta, getEventX, onStart],
  );

  const isDragging = useCallback(() => isDraggingRef.current, []);

  const onPointerMove = useCallback(
    (event: PointerEvent<SVGElement>) => {
      if (activePointerId.current !== event.pointerId) return;
      const x = getEventX(event);
      if (x === null) return;

      const deltaPx = startDeltaPx.current + x - startSvgX.current;
      if (Math.abs(deltaPx) >= PAN_COMMIT_THRESHOLD_PX) {
        event.preventDefault();
        capturePointer(event);
      }
      setDelta(deltaPx);
    },
    [capturePointer, getEventX, setDelta],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent<SVGElement>) => {
      if (activePointerId.current !== event.pointerId) return;

      releasePointer(event);
      resetPointer();

      const deltaPx = getCurrentDelta();
      if (Math.abs(deltaPx) < PAN_COMMIT_THRESHOLD_PX) {
        suppressNextClick.current = false;
        onCancel();
        return;
      }

      event.preventDefault();
      suppressNextClick.current = true;
      onCommit(deltaPx);
    },
    [getCurrentDelta, onCancel, onCommit, releasePointer, resetPointer],
  );

  const onPointerCancel = useCallback(
    (event: PointerEvent<SVGElement>) => {
      if (activePointerId.current !== event.pointerId) return;

      releasePointer(event);
      resetPointer();
      onCancel();
    },
    [onCancel, releasePointer, resetPointer],
  );

  const onClickCapture = useCallback((event: MouseEvent<SVGElement>) => {
    if (!suppressNextClick.current) return;
    suppressNextClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return {
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
  };
}
