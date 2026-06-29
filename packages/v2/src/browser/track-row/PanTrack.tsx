import { useState, type ReactNode } from "react";
import type { PanDragHandlers } from "../viewport/usePanDrag";

export function PanTrack({
  panDrag,
  disabled,
  width,
  height,
  children,
}: {
  panDrag?: PanDragHandlers;
  disabled: boolean;
  width: number;
  height: number;
  children: ReactNode;
}) {
  const [isDragging, setIsDragging] = useState(false);

  if (!panDrag) return children;

  const cursor = disabled ? "default" : isDragging ? "grabbing" : "grab";

  const handlePointerDown: PanDragHandlers["onPointerDown"] = (event) => {
    const started = panDrag.onPointerDown(event);
    if (started) setIsDragging(true);
    return started;
  };

  const handlePointerUp: PanDragHandlers["onPointerUp"] = (event) => {
    panDrag.onPointerUp(event);
    setIsDragging(false);
  };

  const handlePointerCancel: PanDragHandlers["onPointerCancel"] = (event) => {
    panDrag.onPointerCancel(event);
    setIsDragging(false);
  };

  return (
    <g
      style={{ cursor }}
      onPointerDown={handlePointerDown}
      onPointerMove={panDrag.onPointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={panDrag.onClickCapture}
    >
      <rect width={width} height={height} fill="transparent" pointerEvents="all" />
      {children}
    </g>
  );
}
