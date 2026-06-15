import { useCallback, useRef, useState, type PointerEvent } from "react";
import { svgPoint } from "../../utils/svg";

const PAN_COMMIT_THRESHOLD_PX = 10;

export type PanDragHandlers = {
  isDragging: boolean;
  onPointerDown: (event: PointerEvent<SVGRectElement>) => void;
  onPointerMove: (event: PointerEvent<SVGRectElement>) => void;
  onPointerUp: (event: PointerEvent<SVGRectElement>) => void;
  onPointerCancel: (event: PointerEvent<SVGRectElement>) => void;
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
  const [isDragging, setIsDragging] = useState(false);
  const activePointerId = useRef<number | null>(null);
  const startSvgX = useRef(0);
  const startDeltaPx = useRef(0);

  const getEventX = useCallback(
    (event: PointerEvent<SVGRectElement>) => {
      if (!svg) return null;
      return svgPoint(svg, event.clientX, event.clientY)?.x ?? null;
    },
    [svg],
  );

  const releasePointer = useCallback((event: PointerEvent<SVGRectElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const resetPointer = useCallback(() => {
    activePointerId.current = null;
    setIsDragging(false);
  }, []);

  const onPointerDown = useCallback(
    (event: PointerEvent<SVGRectElement>) => {
      if (disabled || !event.isPrimary || event.button !== 0) return;
      const x = getEventX(event);
      if (x === null) return;

      event.preventDefault();
      activePointerId.current = event.pointerId;
      startSvgX.current = x;
      startDeltaPx.current = getCurrentDelta();
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
      onStart();
    },
    [disabled, getCurrentDelta, getEventX, onStart],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<SVGRectElement>) => {
      if (activePointerId.current !== event.pointerId) return;
      const x = getEventX(event);
      if (x === null) return;

      event.preventDefault();
      setDelta(startDeltaPx.current + x - startSvgX.current);
    },
    [getEventX, setDelta],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent<SVGRectElement>) => {
      if (activePointerId.current !== event.pointerId) return;

      event.preventDefault();
      releasePointer(event);
      resetPointer();

      const deltaPx = getCurrentDelta();
      if (Math.abs(deltaPx) < PAN_COMMIT_THRESHOLD_PX) {
        onCancel();
        return;
      }

      onCommit(deltaPx);
    },
    [getCurrentDelta, onCancel, onCommit, releasePointer, resetPointer],
  );

  const onPointerCancel = useCallback(
    (event: PointerEvent<SVGRectElement>) => {
      if (activePointerId.current !== event.pointerId) return;

      releasePointer(event);
      resetPointer();
      onCancel();
    },
    [onCancel, releasePointer, resetPointer],
  );

  return {
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}
