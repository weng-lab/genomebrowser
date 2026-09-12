import { use, useId, useRef } from "react";
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const lane = (
    <foreignObject x={x} y={y} width={overlay?.width ?? width} height={height} pointerEvents="auto">
      <button
        type="button"
        aria-label={`Show error details: ${message}`}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => dialogRef.current?.showModal()}
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
          textOverflow: "ellipsis",
          overflow: "hidden",
          whiteSpace: "nowrap",
          cursor: "pointer",
        }}
      >
        Error — {message}
      </button>
    </foreignObject>
  );

  return (
    <>
      {overlay?.target ? createPortal(lane, overlay.target) : lane}
      {typeof document !== "undefined" &&
        createPortal(
          <dialog
            ref={dialogRef}
            aria-labelledby={headingId}
            style={{
              width: "min(36rem, calc(100vw - 48px))",
              maxHeight: "80vh",
              boxSizing: "border-box",
              overflow: "auto",
              border: "1px solid #aaa",
              borderRadius: 4,
              padding: 20,
              background: "#fff",
              color: "#111",
              font: "14px/1.5 sans-serif",
            }}
          >
            <h2 id={headingId} style={{ margin: "0 0 12px", fontSize: 18 }}>
              Track error
            </h2>
            <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message}</p>
            <form method="dialog">
              <button type="submit">Close</button>
            </form>
          </dialog>,
          document.body,
        )}
    </>
  );
}
