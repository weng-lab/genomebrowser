import { useCallback, useEffect, useReducer, useRef, type ReactNode } from "react";
import type { BrowserRegion } from "../../modules/utils/region";
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
  region: BrowserRegion;
  setRegion: (region: BrowserRegion) => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const [selection, dispatchSelection] = useReducer(selectionReducer, null);
  const selectingRef = useRef(false);
  const selectionRef = useRef<Selection>(selection);
  const cleanupListenersRef = useRef<(() => void) | null>(null);
  selectionRef.current = selection;

  const cleanupListeners = useCallback(() => {
    cleanupListenersRef.current?.();
  }, []);

  useEffect(() => cleanupListeners, [cleanupListeners]);

  const startListening = () => {
    if (!svg) return;
    cleanupListeners();

    const handleMove = (event: MouseEvent) => {
      if (!selectingRef.current) return;
      const point = svgPoint(svg, event.clientX, event.clientY);
      if (!point) return;
      const end = Math.max(marginWidth, Math.min(marginWidth + trackWidth, point.x));
      dispatchSelection({ type: "move", x: end });
    };

    const handleUp = () => {
      if (!selectingRef.current) return;
      cleanupListeners();
      selectingRef.current = false;
      dispatchSelection({ type: "clear" });
      const current = selectionRef.current;
      if (!current) return;
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

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    cleanupListenersRef.current = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      cleanupListenersRef.current = null;
    };
  };

  const handleMouseDown = (event: React.MouseEvent<SVGRectElement>) => {
    if (disabled) return;
    if (!svg) return;
    const point = svgPoint(svg, event.clientX, event.clientY);
    if (!point) return;
    const start = Math.max(marginWidth, Math.min(marginWidth + trackWidth, point.x));
    dispatchSelection({ type: "start", x: start });
    selectingRef.current = true;
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
