import { useCallback, useEffect, useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@mui/material/styles";
import { svgPoint } from "../../../modules/utils/svg";
import { useGenomeBrowser, type GenomeBrowserStores } from "../../state/browserContextState";
import type { BrowserStore } from "../../state/browserStore";
import type { TrackStore } from "../../state/trackStore";
import type { TrackMoveSource } from "../../state/trackPlacement";
import { TRACK_SET_HEADER_HEIGHT, TRACK_SET_TITLE_X } from "../layout/trackLayout";
import { TrackDragContext, type StartTrackDrag } from "./trackDragContext";
import {
  getDragBlocks,
  getDragSourceBounds,
  getTrackDrop,
  type DragBlock,
  type TrackDrop,
} from "./trackDragGeometry";

// A click must travel this far before it can change membership or ordering.
const MIN_DRAG_DISTANCE = 5;
// Permit an append drop just below the final row, matching one header's height.
const APPEND_DROP_ALLOWANCE = TRACK_SET_HEADER_HEIGHT;
const LABEL_WIDTH = 300;
const LABEL_INSET = 40;
const LABEL_HEIGHT = 22;
const LABEL_LINE_GAP = 3;
const LABEL_PADDING = 8;
const LABEL_BASELINE = 15;

type DragSession = GenomeBrowserStores & {
  source: TrackMoveSource;
  pointerId: number;
  startY: number;
  y: number;
  height: number;
  capture: SVGElement;
  svg: SVGSVGElement;
  viewBox: string;
  width: number;
  totalHeight: number;
  blocks: DragBlock[];
  tracks: TrackStore;
  browser: BrowserStore;
};

/** Owns track/set drag initiation, listeners, preview, commit and cleanup. */
export function TrackDragProvider({ children }: { children: ReactNode }) {
  const { useTrackStore, useBrowserStore } = useGenomeBrowser();
  const [session, setSession] = useState<DragSession | null>(null);
  const [preview, setPreview] = useState<TrackDrop | null>(null);
  const start = useCallback<StartTrackDrag>(
    (source, event) => {
      const next = prepareDragSession(source, event, { useTrackStore, useBrowserStore });
      if (!next) return;

      event.preventDefault();
      event.stopPropagation();
      next.capture.setPointerCapture?.(next.pointerId);
      setPreview(null);
      setSession(next);
    },
    [useTrackStore, useBrowserStore],
  );

  useEffect(() => {
    if (!session) return;
    const finish = () => {
      setSession(null);
      setPreview(null);
    };
    if (session.useTrackStore !== useTrackStore || session.useBrowserStore !== useBrowserStore) {
      finish();
      return;
    }
    return listenToDrag(session, setPreview, finish);
  }, [session, useTrackStore, useBrowserStore]);

  return (
    <TrackDragContext value={start}>
      {children}
      {session &&
        createPortal(<TrackDragOverlay session={session} preview={preview} />, session.svg)}
    </TrackDragContext>
  );
}

function prepareDragSession(
  source: TrackMoveSource,
  event: PointerEvent<SVGElement>,
  stores: GenomeBrowserStores,
): DragSession | undefined {
  const tracks = stores.useTrackStore.getState();
  const browser = stores.useBrowserStore.getState();
  const svg = event.currentTarget.ownerSVGElement;
  if (!svg || event.button !== 0 || !event.isPrimary || browser.isLoading) return;

  const point = svgPoint(svg, event.clientX, event.clientY);
  const viewBox = svg.getAttribute("viewBox");
  if (!point || !viewBox) return;
  const [, , width, totalHeight] = viewBox.split(/\s+/).map(Number);
  const blocks = getDragBlocks(tracks, browser.titleSize);
  const bounds = getDragSourceBounds(blocks, source);
  if (!bounds) return;

  return {
    ...stores,
    ...bounds,
    source,
    tracks,
    browser,
    svg,
    viewBox,
    width,
    totalHeight,
    blocks,
    capture: event.currentTarget,
    pointerId: event.pointerId,
    startY: point.y,
  };
}

function isCurrentDrag(session: DragSession) {
  const tracks = session.useTrackStore.getState();
  const browser = session.useBrowserStore.getState();
  return (
    tracks.tracks === session.tracks.tracks &&
    tracks.order === session.tracks.order &&
    tracks.trackSets === session.tracks.trackSets &&
    tracks.hiddenTrackIds === session.tracks.hiddenTrackIds &&
    tracks.pinnedTrackIds === session.tracks.pinnedTrackIds &&
    !browser.isLoading &&
    browser.region === session.browser.region &&
    browser.titleSize === session.browser.titleSize &&
    browser.assembly === session.browser.assembly &&
    browser.trackWidth === session.browser.trackWidth &&
    browser.marginWidth === session.browser.marginWidth &&
    session.svg.getAttribute("viewBox") === session.viewBox
  );
}

function dropAtPointer(session: DragSession, event: globalThis.PointerEvent) {
  const point = svgPoint(session.svg, event.clientX, event.clientY);
  if (
    !point ||
    point.x < 0 ||
    point.x > session.width ||
    point.y < 0 ||
    point.y > session.totalHeight + APPEND_DROP_ALLOWANCE
  )
    return null;
  return getTrackDrop(session.blocks, session.source, point.y);
}

function listenToDrag(
  session: DragSession,
  updatePreview: (next: (current: TrackDrop | null) => TrackDrop | null) => void,
  onFinish: () => void,
) {
  let ended = false;
  const finish = () => {
    if (!ended) {
      ended = true;
      onFinish();
    }
  };
  const invalidate = () => {
    if (!isCurrentDrag(session)) finish();
  };
  const move = (event: globalThis.PointerEvent) => {
    if (ended || event.pointerId !== session.pointerId) return;
    event.preventDefault();
    if (!isCurrentDrag(session)) return finish();

    const next = dropAtPointer(session, event);
    updatePreview((current) =>
      current?.y === next?.y &&
      current?.destination.trackSetId === next?.destination.trackSetId &&
      current?.destination.beforeTrackId === next?.destination.beforeTrackId
        ? current
        : next,
    );
  };
  const up = (event: globalThis.PointerEvent) => {
    if (ended || event.pointerId !== session.pointerId) return;
    event.preventDefault();
    const point = svgPoint(session.svg, event.clientX, event.clientY);
    const drop = dropAtPointer(session, event);
    const commit =
      isCurrentDrag(session) &&
      point &&
      Math.abs(point.y - session.startY) > MIN_DRAG_DISTANCE &&
      drop;
    finish();
    if (commit) session.useTrackStore.getState().moveTrackItem(session.source, commit.destination);
  };
  const cancel = (event: globalThis.PointerEvent) => {
    if (event.pointerId === session.pointerId) finish();
  };
  const key = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      finish();
    }
  };

  invalidate();
  const unsubscribeTracks = session.useTrackStore.subscribe(invalidate);
  const unsubscribeBrowser = session.useBrowserStore.subscribe(invalidate);
  const observer = new MutationObserver(invalidate);
  observer.observe(session.svg, { attributes: true, attributeFilter: ["viewBox"] });
  document.addEventListener("pointermove", move, { passive: false });
  document.addEventListener("pointerup", up);
  document.addEventListener("pointercancel", cancel);
  document.addEventListener("lostpointercapture", cancel);
  document.addEventListener("keydown", key);
  window.addEventListener("blur", finish);
  window.addEventListener("resize", finish);

  return () => {
    ended = true;
    unsubscribeTracks();
    unsubscribeBrowser();
    observer.disconnect();
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
    document.removeEventListener("pointercancel", cancel);
    document.removeEventListener("lostpointercapture", cancel);
    document.removeEventListener("keydown", key);
    window.removeEventListener("blur", finish);
    window.removeEventListener("resize", finish);
    if (session.capture.hasPointerCapture?.(session.pointerId))
      session.capture.releasePointerCapture(session.pointerId);
  };
}

function TrackDragOverlay({
  session,
  preview,
}: {
  session: DragSession;
  preview: TrackDrop | null;
}) {
  const theme = useTheme();
  const width = session.width;
  const inset = Math.min(LABEL_INSET, width / 2);
  const labelWidth = Math.min(LABEL_WIDTH, width - inset * 2);
  const labelX = (width - labelWidth) / 2;
  const labelY = Math.max(0, (preview?.y ?? 0) - LABEL_HEIGHT - LABEL_LINE_GAP);

  return (
    <g
      data-track-export-exclude=""
      style={{ cursor: "grabbing", fontFamily: theme.typography.fontFamily }}
    >
      <rect width={width} height={session.totalHeight} fill="transparent" />
      <rect
        y={session.y}
        width={width}
        height={session.height}
        fill={theme.palette.primary.main}
        fillOpacity={theme.palette.action.selectedOpacity}
        stroke={theme.palette.primary.main}
        strokeDasharray="4 3"
        pointerEvents="none"
      />
      {preview && (
        <g
          data-track-drop-preview=""
          data-drop-set={preview.destination.trackSetId ?? ""}
          pointerEvents="none"
        >
          <line
            x1={preview.destination.trackSetId ? TRACK_SET_TITLE_X : 0}
            x2={width}
            y1={preview.y}
            y2={preview.y}
            stroke={theme.palette.primary.main}
            strokeWidth={3}
          />
          <rect
            x={labelX}
            y={labelY}
            width={labelWidth}
            height={LABEL_HEIGHT}
            fill={theme.palette.background.paper}
            stroke={theme.palette.primary.main}
            rx={theme.shape.borderRadius}
          />
          <svg x={labelX} y={labelY} width={labelWidth} height={LABEL_HEIGHT} overflow="hidden">
            <text
              x={LABEL_PADDING}
              y={LABEL_BASELINE}
              fontSize={theme.typography.caption.fontSize}
              fill={theme.palette.text.primary}
            >
              {preview.label}
            </text>
          </svg>
        </g>
      )}
    </g>
  );
}
