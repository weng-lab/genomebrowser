import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type PointerEvent } from "react";

type PanSession = {
  target: SVGElement;
  pointerId: number;
  startX: number;
  offset: number;
  initialOffset: number;
  captured: boolean;
};

type PanOptions = {
  readX: (event: PointerEvent<SVGElement>) => number | null;
  preview: (offset: number) => number;
  commit: (offset: number) => void;
  cancel: () => void;
};

const PAN_COMMIT_THRESHOLD_PX = 10;

export function usePanGesture(options: PanOptions) {
  const optionsRef = useRef(options);
  const sessionRef = useRef<PanSession | null>(null);
  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  const releaseCapture = useCallback((session: PanSession) => {
    try {
      if (session.target.hasPointerCapture(session.pointerId)) {
        session.target.releasePointerCapture(session.pointerId);
      }
    } catch {
      // The element or pointer may already have been released by the browser.
    }
  }, []);

  const finish = useCallback(
    (commit: boolean) => {
      const session = sessionRef.current;
      if (!session) return;
      sessionRef.current = null;
      releaseCapture(session);
      if (commit && Math.abs(session.offset) >= PAN_COMMIT_THRESHOLD_PX) {
        optionsRef.current.commit(session.offset);
      } else {
        optionsRef.current.cancel();
      }
    },
    [releaseCapture],
  );

  useEffect(() => {
    const onBlur = () => finish(false);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("blur", onBlur);
      finish(false);
    };
  }, [finish]);

  const onPointerDown = useCallback((event: PointerEvent<SVGElement>) => {
    if (sessionRef.current || !event.isPrimary || event.button !== 0) return;
    const x = optionsRef.current.readX(event);
    if (x === null) return;
    const initialOffset = optionsRef.current.preview(0);
    sessionRef.current = {
      target: event.currentTarget,
      pointerId: event.pointerId,
      startX: x,
      offset: initialOffset,
      initialOffset,
      captured: false,
    };
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent<SVGElement>) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      const x = optionsRef.current.readX(event);
      if (x === null) return;
      const movedX = x - session.startX;
      session.offset = optionsRef.current.preview(movedX);
      if (Math.abs(session.initialOffset + movedX) < PAN_COMMIT_THRESHOLD_PX) return;
      event.preventDefault();
      if (session.captured) return;
      try {
        session.target.setPointerCapture(session.pointerId);
        session.captured = true;
      } catch {
        finish(false);
      }
    },
    [finish],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent<SVGElement>) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      const x = optionsRef.current.readX(event);
      if (x !== null) {
        session.offset = optionsRef.current.preview(x - session.startX);
      }
      if (Math.abs(session.offset) >= PAN_COMMIT_THRESHOLD_PX) event.preventDefault();
      finish(true);
    },
    [finish],
  );

  const onPointerCancel = useCallback(
    (event: PointerEvent<SVGElement>) => {
      if (sessionRef.current?.pointerId === event.pointerId) finish(false);
    },
    [finish],
  );
  const onLostPointerCapture = useCallback(
    (event: PointerEvent<SVGElement>) => {
      if (sessionRef.current?.pointerId === event.pointerId) finish(false);
    },
    [finish],
  );

  return useMemo(
    () => ({ onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture }),
    [onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture],
  );
}
