import { useCallback, useMemo, useRef, type MouseEvent, type PointerEvent } from "react";
import { svgPoint } from "../../modules/utils/svg";
import { usePanGesture } from "./usePanGesture";

export type PanDragHandlers = {
  isDragging: () => boolean;
  subscribeEnd: (listener: () => void) => () => void;
  onPointerDown: (event: PointerEvent<SVGElement>) => boolean;
  onPointerMove: (event: PointerEvent<SVGElement>) => void;
  onPointerUp: (event: PointerEvent<SVGElement>) => void;
  onPointerCancel: (event: PointerEvent<SVGElement>) => void;
  onLostPointerCapture: (event: PointerEvent<SVGElement>) => void;
  onClickCapture: (event: MouseEvent<SVGElement>) => void;
};

type UsePanDragOptions = {
  disabled: boolean;
  svg: SVGSVGElement | null;
  getCurrentDelta: () => number;
  setDelta: (deltaPx: number) => number;
  onCommit: (deltaPx: number) => void;
  onCancel: () => void;
};

export function usePanDrag({
  disabled,
  svg,
  getCurrentDelta,
  setDelta,
  onCommit,
  onCancel,
}: UsePanDragOptions): PanDragHandlers {
  const activePointerId = useRef<number | null>(null);
  const startDeltaPx = useRef(0);
  const suppressNextClick = useRef(false);
  const endListeners = useRef(new Set<() => void>());

  const endDrag = useCallback(() => {
    activePointerId.current = null;
    for (const listener of endListeners.current) listener();
  }, []);

  const gesture = usePanGesture({
    readX: (event) => (svg ? (svgPoint(svg, event.clientX, event.clientY)?.x ?? null) : null),
    preview: (deltaPx) => setDelta(startDeltaPx.current + deltaPx),
    commit: (deltaPx) => {
      endDrag();
      suppressNextClick.current = true;
      onCommit(deltaPx);
    },
    cancel: () => {
      endDrag();
      suppressNextClick.current = false;
      onCancel();
    },
  });

  const onPointerDown = useCallback(
    (event: PointerEvent<SVGElement>) => {
      if (disabled || activePointerId.current !== null || !event.isPrimary || event.button !== 0) {
        return false;
      }
      if (!svg || svgPoint(svg, event.clientX, event.clientY) === null) return false;
      startDeltaPx.current = getCurrentDelta();
      gesture.onPointerDown(event);
      activePointerId.current = event.pointerId;
      return true;
    },
    [disabled, getCurrentDelta, gesture, svg],
  );

  const isDragging = useCallback(() => activePointerId.current !== null, []);
  const subscribeEnd = useCallback((listener: () => void) => {
    endListeners.current.add(listener);
    return () => {
      endListeners.current.delete(listener);
    };
  }, []);

  const onClickCapture = useCallback((event: MouseEvent<SVGElement>) => {
    if (!suppressNextClick.current) return;
    suppressNextClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return useMemo(
    () => ({
      isDragging,
      subscribeEnd,
      onPointerDown,
      onPointerMove: gesture.onPointerMove,
      onPointerUp: gesture.onPointerUp,
      onPointerCancel: gesture.onPointerCancel,
      onLostPointerCapture: gesture.onLostPointerCapture,
      onClickCapture,
    }),
    [isDragging, subscribeEnd, onPointerDown, gesture, onClickCapture],
  );
}
