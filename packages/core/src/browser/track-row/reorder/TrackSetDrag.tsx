import type { TrackSetDragHandle } from "./trackSetDragState";
import { useCallback, useEffect, useImperativeHandle, useState, type Ref } from "react";
import { svgPoint } from "../../../modules/utils/svg";
import { useGenomeBrowser } from "../../state/browserContextState";
import type { TrackStoreInstance } from "../../state/trackStore";
import type { BrowserStoreInstance } from "../../state/browserStore";
import type { TrackMoveSource, TrackMoveDestination } from "../../state/trackPlacement";
import {
  TRACK_SET_HEADER_HEIGHT,
  type TrackLayout,
  type TrackSetLayout,
} from "../layout/trackLayout";

type Block = {
  id: string;
  title: string;
  group: boolean;
  ids: string[];
  rows: TrackLayout[];
  y: number;
  end: number;
  pinned: boolean;
};
type Drop = { destination: TrackMoveDestination; y: number; label: string };
type Session = {
  trackStore: TrackStoreInstance;
  browserStore: BrowserStoreInstance;
  source: TrackMoveSource;
  pointerId: number;
  startY: number;
  y: number;
  height: number;
  capture: SVGElement;
  blocks: Block[];
  current: () => boolean;
};
/** Owns structured drag initiation, hit testing, preview, commit and interruption. */
export function TrackSetDragController({
  svg,
  trackLayouts,
  trackSetLayouts,
  width,
  totalHeight,
  ref,
}: {
  svg: SVGSVGElement | null;
  trackLayouts: TrackLayout[];
  trackSetLayouts: TrackSetLayout[];
  width: number;
  totalHeight: number;
  ref: Ref<TrackSetDragHandle>;
}) {
  const { useTrackStore, useBrowserStore } = useGenomeBrowser();
  const [session, setSession] = useState<Session | null>(null);
  const [preview, setPreview] = useState<Drop | null>(null);
  const start = useCallback<TrackSetDragHandle>(
    (source, event) => {
      const state = useTrackStore.getState();
      const browser = useBrowserStore.getState();
      if (!svg || event.button !== 0 || !event.isPrimary || browser.isLoading) return;
      const point = svgPoint(svg, event.clientX, event.clientY);
      if (!point) return;
      const rows = new Map(trackLayouts.map((row) => [row.id, row]));
      const headers = new Map(trackSetLayouts.map((row) => [row.id, row]));
      const pinned = new Set(state.pinnedTrackIds);
      const owners = new Map(
        state.trackSets.flatMap((set) => set.trackIds.map((id) => [id, set] as const)),
      );
      const blocks: Block[] = [];
      const seen = new Set<string>();
      for (const id of state.order) {
        const owner = owners.get(id);
        const blockId = owner?.id ?? id;
        if (seen.has(blockId)) continue;
        seen.add(blockId);
        const ids = owner ? state.order.filter((id) => owners.get(id)?.id === owner.id) : [id];
        const visible = ids.flatMap((id) => (rows.has(id) ? [rows.get(id)!] : []));
        const y = owner ? headers.get(owner.id)?.y : rows.get(id)?.y;
        if (y === undefined) continue;
        blocks.push({
          id: blockId,
          title: owner?.title ?? state.getTrack(id)!.base.title,
          group: !!owner,
          ids,
          rows: visible,
          y,
          end: visible.at(-1)
            ? visible.at(-1)!.y + visible.at(-1)!.wrapperHeight
            : y + TRACK_SET_HEADER_HEIGHT,
          pinned: ids.some((id) => pinned.has(id)),
        });
      }
      const block = blocks.find((block) =>
        source.kind === "set" ? block.id === source.id : block.ids.includes(source.id),
      );
      const row = rows.get(source.id);
      if (!block || block.pinned || (source.kind === "track" && !row)) return;
      event.preventDefault();
      event.stopPropagation();
      const viewBox = svg.getAttribute("viewBox");
      const capture = event.currentTarget;
      capture.setPointerCapture?.(event.pointerId);
      setPreview(null);
      setSession({
        trackStore: useTrackStore,
        browserStore: useBrowserStore,
        source,
        pointerId: event.pointerId,
        startY: point.y,
        y: source.kind === "set" ? block.y : row!.y,
        height: source.kind === "set" ? block.end - block.y : row!.wrapperHeight,
        capture,
        blocks,
        current: () => {
          const next = useTrackStore.getState();
          const view = useBrowserStore.getState();
          return (
            next.tracks === state.tracks &&
            next.order === state.order &&
            next.trackSets === state.trackSets &&
            next.hiddenTrackIds === state.hiddenTrackIds &&
            next.pinnedTrackIds === state.pinnedTrackIds &&
            !view.isLoading &&
            view.region === browser.region &&
            view.titleSize === browser.titleSize &&
            view.assembly === browser.assembly &&
            view.trackWidth === browser.trackWidth &&
            svg.getAttribute("viewBox") === viewBox
          );
        },
      });
    },
    [svg, trackLayouts, trackSetLayouts, useTrackStore, useBrowserStore],
  );
  useImperativeHandle(ref, () => start, [start]);
  useEffect(() => {
    if (!session || !svg) return;
    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      setSession(null);
      setPreview(null);
    };
    if (session.trackStore !== useTrackStore || session.browserStore !== useBrowserStore) {
      finish();
      return;
    }
    const target = (event: PointerEvent) => {
      const point = svgPoint(svg, event.clientX, event.clientY);
      return point &&
        point.x >= 0 &&
        point.x <= width &&
        point.y >= 0 &&
        point.y <= totalHeight + 32
        ? getDrop(session, point.y)
        : null;
    };
    const move = (event: PointerEvent) => {
      if (ended || event.pointerId !== session.pointerId) return;
      event.preventDefault();
      if (!session.current()) {
        finish();
        return;
      }
      const next = target(event);
      setPreview((current) =>
        current?.y === next?.y &&
        current?.destination.trackSetId === next?.destination.trackSetId &&
        current?.destination.beforeTrackId === next?.destination.beforeTrackId
          ? current
          : next,
      );
    };
    const up = (event: PointerEvent) => {
      if (ended || event.pointerId !== session.pointerId) return;
      event.preventDefault();
      const point = svgPoint(svg, event.clientX, event.clientY);
      const drop = target(event);
      const commit = session.current() && point && Math.abs(point.y - session.startY) > 5 && drop;
      finish();
      if (commit) useTrackStore.getState().moveTrackItem(session.source, commit.destination);
    };
    const cancel = (event: PointerEvent) => {
      if (event.pointerId === session.pointerId) finish();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish();
      }
    };
    const invalidate = () => {
      if (!session.current()) finish();
    };
    invalidate();
    const unsubscribeTracks = useTrackStore.subscribe(invalidate);
    const unsubscribeBrowser = useBrowserStore.subscribe(invalidate);
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
  }, [session, svg, width, totalHeight, useTrackStore, useBrowserStore]);
  return (
    <TrackSetDragOverlay width={width} height={totalHeight} session={session} preview={preview} />
  );
}

function TrackSetDragOverlay({
  width,
  height,
  session,
  preview,
}: {
  width: number;
  height: number;
  session: Session | null;
  preview: Drop | null;
}) {
  if (!session) return null;
  return (
    <g data-track-export-exclude="" style={{ cursor: "grabbing" }}>
      <rect width={width} height={height} fill="transparent" />
      <rect
        y={session.y}
        width={width}
        height={session.height}
        fill="#1976d2"
        fillOpacity={0.08}
        stroke="#1976d2"
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
            x1={preview.destination.trackSetId ? 36 : 0}
            x2={width}
            y1={preview.y}
            y2={preview.y}
            stroke="#1976d2"
            strokeWidth={3}
          />
          <rect
            x={Math.max(40, width / 2 - 150)}
            y={Math.max(0, preview.y - 25)}
            width={300}
            height={22}
            fill="white"
            stroke="#1976d2"
            rx={3}
          />
          <text
            x={Math.max(40, width / 2 - 150) + 8}
            y={Math.max(0, preview.y - 25) + 15}
            fontSize={12}
            fill="#1455a0"
          >
            {preview.label}
          </text>
        </g>
      )}
    </g>
  );
}
function getDrop(session: Session, y: number): Drop | null {
  const blocks = session.blocks;
  const outside = (index: number): Drop | null => {
    if (blocks[index]?.pinned) return null;
    return {
      destination: { beforeTrackId: blocks[index]?.ids[0] },
      y: blocks[index]?.y ?? blocks.at(-1)?.end ?? 0,
      label: session.source.kind === "set" ? "Move track set here" : "Move outside groups",
    };
  };
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (y > block.end) continue;
    if (y < block.y) return outside(index);
    if (session.source.kind === "set")
      return outside(y < (block.y + block.end) / 2 ? index : index + 1);
    if (block.pinned) return y >= block.end - 6 ? outside(index + 1) : null;
    if (!block.group) return outside(y < (block.y + block.end) / 2 ? index : index + 1);
    if (y <= block.y + 6) return outside(index);
    if (y >= block.end - 6 && block.rows.length) return outside(index + 1);
    if (y < block.y + TRACK_SET_HEADER_HEIGHT)
      return {
        destination: {
          trackSetId: block.id,
          beforeTrackId: block.rows.length ? block.ids[0] : undefined,
        },
        y: block.y + TRACK_SET_HEADER_HEIGHT,
        label: `Add to ${block.title}`,
      };
    for (const row of block.rows) {
      if (y > row.y + row.wrapperHeight) continue;
      const before = y < row.y + row.wrapperHeight / 2;
      return {
        destination: {
          trackSetId: block.id,
          beforeTrackId: before ? row.id : block.ids[block.ids.indexOf(row.id) + 1],
        },
        y: before ? row.y : row.y + row.wrapperHeight,
        label: `Move to ${block.title}`,
      };
    }
  }
  return outside(blocks.length);
}
