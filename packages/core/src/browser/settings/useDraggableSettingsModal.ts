import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type RefCallback,
} from "react";
import type { SettingsPosition } from "./types";

export const SETTINGS_MODAL_VIEWPORT_INSET = 8;

export type DraggableSettingsModalResult = {
  position: SettingsPosition;
  modalRef: RefCallback<HTMLDialogElement>;
  handleProps: {
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
    style: CSSProperties;
  };
};

export function useDraggableSettingsModal(
  initialPosition: SettingsPosition,
): DraggableSettingsModalResult {
  const [position, setPosition] = useState(initialPosition);
  const [previousInitialPosition, setPreviousInitialPosition] = useState(initialPosition);
  const dragOffset = useRef<SettingsPosition | null>(null);
  const modalElement = useRef<HTMLDialogElement | null>(null);

  const clampPosition = useCallback((candidate: SettingsPosition): SettingsPosition => {
    const modal = modalElement.current;
    if (!modal) return candidate;

    const bounds = modal.getBoundingClientRect();
    return {
      x: clamp(
        candidate.x,
        SETTINGS_MODAL_VIEWPORT_INSET,
        window.innerWidth - bounds.width - SETTINGS_MODAL_VIEWPORT_INSET,
      ),
      y: clamp(
        candidate.y,
        SETTINGS_MODAL_VIEWPORT_INSET,
        window.innerHeight - bounds.height - SETTINGS_MODAL_VIEWPORT_INSET,
      ),
    };
  }, []);

  const updatePositionWithinViewport = useCallback(() => {
    setPosition((currentPosition) => {
      const nextPosition = clampPosition(currentPosition);
      return positionsAreEqual(currentPosition, nextPosition) ? currentPosition : nextPosition;
    });
  }, [clampPosition]);

  const modalRef = useCallback<RefCallback<HTMLDialogElement>>(
    (element) => {
      modalElement.current = element;
      if (element) updatePositionWithinViewport();
    },
    [updatePositionWithinViewport],
  );

  if (
    initialPosition.x !== previousInitialPosition.x ||
    initialPosition.y !== previousInitialPosition.y
  ) {
    setPreviousInitialPosition(initialPosition);
    setPosition(clampPosition(initialPosition));
  }

  useEffect(() => {
    window.addEventListener("resize", updatePositionWithinViewport);
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(updatePositionWithinViewport);
    if (modalElement.current) resizeObserver?.observe(modalElement.current);

    return () => {
      window.removeEventListener("resize", updatePositionWithinViewport);
      resizeObserver?.disconnect();
    };
  }, [updatePositionWithinViewport]);

  const handleDragStart = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOffset.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
  };

  const handleDragMove = (event: PointerEvent<HTMLElement>) => {
    if (!dragOffset.current) return;
    setPosition(
      clampPosition({
        x: event.clientX - dragOffset.current.x,
        y: event.clientY - dragOffset.current.y,
      }),
    );
  };

  const handleDragEnd = (event: PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragOffset.current = null;
  };

  return {
    position,
    modalRef,
    handleProps: {
      onPointerDown: handleDragStart,
      onPointerMove: handleDragMove,
      onPointerUp: handleDragEnd,
      onPointerCancel: handleDragEnd,
      style: {
        cursor: "grab",
        touchAction: "none",
        userSelect: "none",
      },
    },
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function positionsAreEqual(left: SettingsPosition, right: SettingsPosition) {
  return left.x === right.x && left.y === right.y;
}
