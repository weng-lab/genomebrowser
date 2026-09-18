import { use } from "react";
import { createPortal } from "react-dom";
import { trackOverlayContext } from "../track-overlay/context";

export function ErrorState({
  x,
  y,
  width,
  height,
  message,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  message: string;
}) {
  const overlay = use(trackOverlayContext);
  const lane = (
    <foreignObject x={x} y={y} width={overlay?.width ?? width} height={height} pointerEvents="auto">
      <div
        role="region"
        aria-label="Track error"
        tabIndex={0}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          padding: "0 4px",
          border: 0,
          background: "#fff",
          color: "#9b1c1c",
          font: `${Math.min(12, height)}px sans-serif`,
          textAlign: "left",
          boxSizing: "border-box",
          overflow: "auto",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
        }}
      >
        Error — {message}
      </div>
    </foreignObject>
  );

  return overlay?.target ? createPortal(lane, overlay.target) : lane;
}
