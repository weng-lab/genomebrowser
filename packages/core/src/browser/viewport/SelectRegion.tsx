import { useEffect, useReducer, useRef, type ReactNode } from "react";
import type { GenomicRegion } from "../../genome/region";
import { createReverseXScale } from "../../modules/utils/scale";
import { svgPoint } from "../../modules/utils/svg";

type Selection = { start: number; end: number } | null;
type SelectionAction =
  | { type: "start"; x: number }
  | { type: "move"; x: number }
  | { type: "clear" };

export function SelectRegion({
  svg,
  marginWidth,
  trackWidth,
  totalHeight,
  region,
  setRegion,
  disabled = false,
  children,
}: {
  svg: SVGSVGElement | null;
  marginWidth: number;
  trackWidth: number;
  totalHeight: number;
  region: GenomicRegion;
  setRegion: (region: GenomicRegion) => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const [selection, dispatchSelection] = useReducer(selectionReducer, null);
  const dragSessionRef = useRef<Selection>(null);
  const cleanupListenersRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      cleanupListenersRef.current?.();
      cleanupListenersRef.current = null;
    },
    [],
  );

  const startListening = () => {
    if (!svg) return;
    cleanupListenersRef.current?.();

    const handleMove = (event: MouseEvent) => {
      const current = dragSessionRef.current;
      if (!current) return;
      const point = svgPoint(svg, event.clientX, event.clientY);
      if (!point) return;
      const end = Math.max(marginWidth, Math.min(marginWidth + trackWidth, point.x));
      dragSessionRef.current = { ...current, end };
      dispatchSelection({ type: "move", x: end });
    };

    const handleUp = () => {
      const current = dragSessionRef.current;
      cleanupListenersRef.current?.();
      cleanupListenersRef.current = null;
      if (!current) return;
      dragSessionRef.current = null;
      dispatchSelection({ type: "clear" });
      const start = Math.min(current.start, current.end);
      const end = Math.max(current.start, current.end);
      if (end - start >= 10) {
        const reverseX = createReverseXScale(region, trackWidth);
        setRegion({
          chromosome: region.chromosome,
          start: reverseX(start - marginWidth),
          end: reverseX(end - marginWidth),
        });
      }
    };

    cleanupListenersRef.current = listenForDocumentMouseEvents(handleMove, handleUp);
  };

  const handleMouseDown = (event: React.MouseEvent<SVGRectElement>) => {
    if (disabled) return;
    if (!svg) return;
    const point = svgPoint(svg, event.clientX, event.clientY);
    if (!point) return;
    const start = Math.max(marginWidth, Math.min(marginWidth + trackWidth, point.x));
    dragSessionRef.current = { start, end: start };
    dispatchSelection({ type: "start", x: start });
    startListening();
  };

  return (
    <>
      <rect
        fill="#ffffff"
        width={trackWidth}
        height={80}
        x={marginWidth}
        y={0}
        onMouseDown={handleMouseDown}
      />
      {children}
      {selection && (
        <rect
          id="selectRegion"
          fill="#6666aaaa"
          stroke="#000000"
          strokeWidth={0.5}
          strokeDasharray="5 5"
          x={Math.min(selection.start, selection.end)}
          y={0}
          width={Math.abs(selection.end - selection.start)}
          height={totalHeight}
          style={{ pointerEvents: "none" }}
        />
      )}
    </>
  );
}

function listenForDocumentMouseEvents(
  handleMove: (event: MouseEvent) => void,
  handleUp: () => void,
) {
  document.addEventListener("mousemove", handleMove);
  document.addEventListener("mouseup", handleUp);

  return () => {
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", handleUp);
  };
}

function selectionReducer(selection: Selection, action: SelectionAction): Selection {
  switch (action.type) {
    case "start":
      return { start: action.x, end: action.x };
    case "move":
      return selection ? { ...selection, end: action.x } : selection;
    case "clear":
      return null;
  }
}
