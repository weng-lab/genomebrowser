import {
  useCallback,
  useLayoutEffect,
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

type SelectionContext = {
  region: GenomicRegion;
  svg: SVGSVGElement | null;
  marginWidth: number;
  trackWidth: number;
  totalHeight: number;
  highlightStyle: SelectionHighlightStyle;
};
type Selection = {
  start: number;
  end: number;
  mode: "zoom" | "highlight";
  pointerId: number;
  context: SelectionContext;
  requestedModeFrom?: BrowserSelectionMode;
};
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
  onModeChange,
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
  onModeChange?: (mode: BrowserSelectionMode) => void;
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
  const context: SelectionContext = {
    region,
    svg,
    marginWidth,
    trackWidth,
    totalHeight,
    highlightStyle,
  };
  const visibleSelection =
    selection && isSelectionCurrent(selection, context, mode, disabled) ? selection : null;
  // Discard obsolete state during render so it cannot return if props change back.
  if (selection && !visibleSelection) setSelection(null);
  else if (selection?.requestedModeFrom && selection.mode === mode) {
    // A ruler drag requests Zoom while its parent still renders Pan.
    setSelection({ ...selection, requestedModeFrom: undefined });
  }

  const detach = useCallback(() => {
    cleanup.current?.();
    cleanup.current = null;
    session.current = null;
  }, []);
  const cancel = useCallback(() => {
    detach();
    setSelection(null);
  }, [detach]);

  // Native listeners must be gone before a changed context can receive input.
  useLayoutEffect(() => {
    if (session.current && !isSelectionCurrent(session.current, context, mode, disabled)) detach();
    else if (session.current?.requestedModeFrom && session.current.mode === mode)
      session.current = { ...session.current, requestedModeFrom: undefined };
  });
  useLayoutEffect(() => detach, [detach]);

  const startSelection = (event: ReactPointerEvent<SVGGElement>, selectionMode = mode) => {
    if (disabled || !hasValidDimensions || !svg || event.button !== 0 || event.isPrimary === false)
      return;
    if (selectionMode === "pan") return;
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
    if (selectionMode !== mode) onModeChange?.(selectionMode);
    session.current = {
      start,
      end: start,
      mode: selectionMode,
      pointerId: event.pointerId,
      context,
      requestedModeFrom: selectionMode !== mode ? mode : undefined,
    };
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

  const selectedRegion = visibleSelection
    ? getSelectedRegion(visibleSelection, region, marginWidth, trackWidth)
    : null;

  return (
    <g
      onPointerDownCapture={(event) => {
        if (mode !== "pan" || !onModeChange || !(event.target instanceof Element)) return;
        const target = event.target.closest('[data-genomebrowser-selection-mode="zoom"]');
        if (target && event.currentTarget.contains(target)) startSelection(event, "zoom");
      }}
    >
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
            onPointerDown={(event) => startSelection(event)}
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
      {visibleSelection && (
        <g pointerEvents="none">
          <rect
            data-region-selection=""
            fill={visibleSelection.mode === "highlight" ? highlightStyle.color : "#2563eb"}
            fillOpacity={0.18}
            stroke={visibleSelection.mode === "highlight" ? highlightStyle.color : "#2563eb"}
            strokeDasharray="4 3"
            x={Math.min(visibleSelection.start, visibleSelection.end)}
            y={0}
            width={Math.abs(visibleSelection.end - visibleSelection.start)}
            height={totalHeight}
          />
          <text
            x={Math.min(visibleSelection.start, visibleSelection.end) + 6}
            y={16}
            fontSize={12}
            fill="#172554"
          >
            {visibleSelection.mode === "zoom" ? "Zoom" : "Highlight"} ·{" "}
            {selectedRegion ? (selectedRegion.end - selectedRegion.start).toLocaleString() : 0} bp
          </text>
        </g>
      )}
    </g>
  );
}

function isSelectionCurrent(
  selection: Selection,
  context: SelectionContext,
  mode: BrowserSelectionMode,
  disabled: boolean,
) {
  return (
    !disabled &&
    (selection.mode === mode || selection.requestedModeFrom === mode) &&
    selection.context.region === context.region &&
    selection.context.svg === context.svg &&
    selection.context.marginWidth === context.marginWidth &&
    selection.context.trackWidth === context.trackWidth &&
    selection.context.totalHeight === context.totalHeight &&
    selection.context.highlightStyle === context.highlightStyle
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
