import { use, useState, type ReactNode } from "react";
import { InteractionGateContext } from "../state/browserContextState";
import type { PanDragHandlers } from "../viewport/usePanDrag";

export function PanTrack({
  panDrag,
  width,
  height,
  children,
}: {
  panDrag?: PanDragHandlers;
  width: number;
  height: number;
  children: ReactNode;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const disabled = use(InteractionGateContext)?.isInteractionBlocked ?? false;

  if (!panDrag) return children;

  const cursor = disabled ? "default" : isDragging ? "grabbing" : "grab";

  const handlePointerDown: PanDragHandlers["onPointerDown"] = (event) => {
    if (disabled) return false;
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
      style={{ cursor, touchAction: "pan-y pinch-zoom" }}
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
