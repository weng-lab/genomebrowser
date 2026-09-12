import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { GenomicRegion } from "../../genome/region";
import { svgPoint } from "../../modules/utils/svg";
import type {
  BrowserRegionMutationResult,
  BrowserSelectionMode,
  Highlight,
  SelectionHighlightStyle,
} from "../state/browserStore";

import { createHighlightId } from "./createHighlightId";

type Selection = { start: number; end: number; mode: "zoom" | "highlight"; pointerId: number };
const DEFAULT_HIGHLIGHT: SelectionHighlightStyle = {
  color: "#f59e0b",
  opacity: 0.25,
  type: "filled",
};

export function SelectRegion({
  svg,
  marginWidth,
  trackWidth,
  totalHeight,
  region,
  setRegion,
  disabled = false,
  mode = "zoom",
  highlightStyle = DEFAULT_HIGHLIGHT,
  onHighlight,
  highlights = [],
  children,
}: {
  svg: SVGSVGElement | null;
  marginWidth: number;
  trackWidth: number;
  totalHeight: number;
  region: GenomicRegion;
  setRegion: (region: GenomicRegion) => BrowserRegionMutationResult;
  disabled?: boolean;
  mode?: BrowserSelectionMode;
  highlightStyle?: SelectionHighlightStyle;
  onHighlight?: (highlight: Highlight) => void;
  highlights?: readonly Highlight[];
  children?: ReactNode;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const session = useRef<Selection | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const guide = useRef<SVGLineElement | null>(null);
  const selectionActive = mode !== "pan" && !disabled;
  const hasValidDimensions = [marginWidth, trackWidth, totalHeight].every(
    (value) => Number.isFinite(value) && value > 0,
  );
  const cancel = useCallback(() => {
    cleanup.current?.();
    cleanup.current = null;
    session.current = null;
    setSelection(null);
  }, []);

  useEffect(
    () => cancel,
    [cancel, disabled, mode, highlightStyle, marginWidth, trackWidth, totalHeight, region, svg],
  );

  const startSelection = (event: ReactPointerEvent<SVGGElement>) => {
    if (disabled || !hasValidDimensions || !svg || event.button !== 0 || event.isPrimary === false)
      return;
    if (mode === "pan") return;
    const point = svgPoint(svg, event.clientX, event.clientY);
    if (
      !point ||
      !Number.isFinite(point.x) ||
      point.x < marginWidth ||
      point.x > marginWidth + trackWidth
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    cancel();
    const start = point.x;
    session.current = { start, end: start, mode, pointerId: event.pointerId };
    setSelection(session.current);
    const move = (event: PointerEvent) => {
      if (!session.current || session.current.pointerId !== event.pointerId) return;
      const point = svgPoint(svg, event.clientX, event.clientY);
      if (!point || !Number.isFinite(point.x)) return;
      session.current = {
        ...session.current,
        end: Math.max(marginWidth, Math.min(marginWidth + trackWidth, point.x)),
      };
      setSelection(session.current);
    };
    const up = (event: PointerEvent) => {
      if (session.current?.pointerId !== event.pointerId) return;
      move(event);
      const current = session.current;
      cancel();
      if (!current || Math.abs(current.end - current.start) < 4) return;
      const selectedRegion = getSelectedRegion(current, region, marginWidth, trackWidth);
      if (current.mode === "zoom") setRegion(selectedRegion);
      else
        onHighlight?.({
          ...highlightStyle,
          id: createHighlightId(selectedRegion, highlights),
          region: selectedRegion,
        });
    };
    const pointerCancel = (event: PointerEvent) => {
      if (session.current?.pointerId === event.pointerId) cancel();
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", pointerCancel);
    document.addEventListener("keydown", keyDown);
    window.addEventListener("blur", cancel);
    cleanup.current = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", pointerCancel);
      document.removeEventListener("keydown", keyDown);
      window.removeEventListener("blur", cancel);
    };
  };

  const selectedRegion = selection
    ? getSelectedRegion(selection, region, marginWidth, trackWidth)
    : null;

  return (
    <g>
      <rect
        fill="transparent"
        pointerEvents="all"
        width={hasValidDimensions ? trackWidth : 0}
        height={hasValidDimensions ? totalHeight : 0}
        x={hasValidDimensions ? marginWidth : 0}
      />
      {children}
      {selectionActive && hasValidDimensions && (
        <g>
          <rect
            data-selection-overlay=""
            x={marginWidth}
            width={trackWidth}
            height={totalHeight}
            fill="transparent"
            pointerEvents="all"
            style={{ cursor: "crosshair", touchAction: "none", userSelect: "none" }}
            onPointerDown={startSelection}
            onPointerMove={(event) => {
              if (!svg || !guide.current) return;
              const point = svgPoint(svg, event.clientX, event.clientY);
              if (!point || !Number.isFinite(point.x)) return;
              guide.current.setAttribute("x1", String(point.x));
              guide.current.setAttribute("x2", String(point.x));
              guide.current.style.visibility = "visible";
            }}
            onPointerLeave={() => {
              if (guide.current) guide.current.style.visibility = "hidden";
            }}
            onPointerCancel={() => {
              if (guide.current) guide.current.style.visibility = "hidden";
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          />
          <line
            ref={guide}
            data-cursor-guide=""
            y1={0}
            y2={totalHeight}
            stroke="currentColor"
            strokeOpacity={0.6}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
            style={{ visibility: "hidden" }}
          />
        </g>
      )}
      {selection && (
        <g pointerEvents="none">
          <rect
            data-region-selection=""
            fill={selection.mode === "highlight" ? highlightStyle.color : "#2563eb"}
            fillOpacity={0.18}
            stroke={selection.mode === "highlight" ? highlightStyle.color : "#2563eb"}
            strokeDasharray="4 3"
            x={Math.min(selection.start, selection.end)}
            y={0}
            width={Math.abs(selection.end - selection.start)}
            height={totalHeight}
          />
          <text
            x={Math.min(selection.start, selection.end) + 6}
            y={16}
            fontSize={12}
            fill="#172554"
          >
            {selection.mode === "zoom" ? "Zoom" : "Highlight"} ·{" "}
            {selectedRegion ? (selectedRegion.end - selectedRegion.start).toLocaleString() : 0} bp
          </text>
        </g>
      )}
    </g>
  );
}

function getSelectedRegion(
  selection: Selection,
  region: GenomicRegion,
  marginWidth: number,
  trackWidth: number,
): GenomicRegion {
  const span = region.end - region.start;
  const start = Math.max(
    region.start,
    Math.floor(
      region.start + ((Math.min(selection.start, selection.end) - marginWidth) / trackWidth) * span,
    ),
  );
  const end = Math.min(
    region.end,
    Math.max(
      start + 1,
      Math.ceil(
        region.start +
          ((Math.max(selection.start, selection.end) - marginWidth) / trackWidth) * span,
      ),
    ),
  );
  return { chromosome: region.chromosome, start, end };
}
