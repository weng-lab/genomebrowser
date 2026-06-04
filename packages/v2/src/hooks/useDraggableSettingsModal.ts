import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { SettingsPosition } from "../stores/settingsStore";

export type DraggableSettingsModalResult = {
  position: SettingsPosition;
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
  const dragOffset = useRef<SettingsPosition | null>(null);

  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition.x, initialPosition.y]);

  const handleDragStart = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOffset.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
  };

  const handleDragMove = (event: PointerEvent<HTMLElement>) => {
    if (!dragOffset.current) return;
    setPosition({
      x: event.clientX - dragOffset.current.x,
      y: event.clientY - dragOffset.current.y,
    });
  };

  const handleDragEnd = (event: PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragOffset.current = null;
  };

  return {
    position,
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
