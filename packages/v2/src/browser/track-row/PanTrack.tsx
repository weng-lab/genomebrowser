import type { ReactNode } from "react";
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
  if (!panDrag) return children;

  const cursor = disabled ? "default" : panDrag.isDragging ? "grabbing" : "grab";

  return (
    <g
      style={{ cursor }}
      onPointerDown={panDrag.onPointerDown}
      onPointerMove={panDrag.onPointerMove}
      onPointerUp={panDrag.onPointerUp}
      onPointerCancel={panDrag.onPointerCancel}
      onClickCapture={panDrag.onClickCapture}
    >
      <rect width={width} height={height} fill="transparent" pointerEvents="all" />
      {children}
    </g>
  );
}
