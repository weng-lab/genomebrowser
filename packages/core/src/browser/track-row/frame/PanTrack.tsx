import { useEffect, useState, type ReactNode } from "react";
import { useIsInteractionBlocked } from "../../state/browserContextState";
import type { BrowserPan } from "../../viewport/useBrowserPan";

export function PanTrack({
  panDrag,
  width,
  height,
  children,
}: {
  panDrag: BrowserPan;
  width: number;
  height: number;
  children: ReactNode;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const disabled = useIsInteractionBlocked();

  useEffect(() => panDrag.subscribeEnd(() => setIsDragging(false)), [panDrag]);

  const cursor = disabled ? "default" : isDragging ? "grabbing" : "grab";

  const handlePointerDown: BrowserPan["onPointerDown"] = (event) => {
    if (disabled) return false;
    const started = panDrag.onPointerDown(event);
    if (started) setIsDragging(true);
    return started;
  };

  return (
    <g
      style={{ cursor, touchAction: "pan-y pinch-zoom" }}
      onPointerDown={handlePointerDown}
      onPointerMove={panDrag.onPointerMove}
      onPointerUp={panDrag.onPointerUp}
      onPointerCancel={panDrag.onPointerCancel}
      onLostPointerCapture={panDrag.onLostPointerCapture}
      onClickCapture={panDrag.onClickCapture}
    >
      <rect width={width} height={height} fill="transparent" pointerEvents="all" />
      {children}
    </g>
  );
}
