import type { TrackMoveDestination, TrackMoveSource } from "../../state/trackPlacement";
import { canTransferTrack, getTrackBlocks, type TrackBlock } from "../../state/trackSets";
import type { TrackStore } from "../../state/trackStore";
import { TRACK_SET_HEADER_HEIGHT, type TrackLayout } from "../layout/trackLayout";
import { getTrackLayoutSnapshot } from "../layout/useTrackLayout";

// Header and last-row edge bands select a standalone destination instead of membership.
const TRACK_SET_EDGE_DROP_ZONE = 6;

export type DragBlock = TrackBlock & {
  title: string;
  rows: TrackLayout[];
  y: number;
  end: number;
};

export type TrackDrop = { destination: TrackMoveDestination; y: number; label: string };

export function getDragBlocks(state: TrackStore, titleSize: number): DragBlock[] {
  const layout = getTrackLayoutSnapshot(state, titleSize);
  const rows = new Map(layout.trackLayouts.map((row) => [row.id, row]));
  const headers = new Map(layout.trackSetLayouts.map((header) => [header.id, header]));
  const tracks = new Map(state.tracks.map((track) => [track.base.id, track]));

  return getTrackBlocks(state).flatMap((block) => {
    const header = block.trackSet ? headers.get(block.id) : undefined;
    const row = rows.get(block.id);
    const y = header?.y ?? row?.y;
    if (y === undefined) return [];

    return [
      {
        ...block,
        y,
        title: block.trackSet?.title ?? tracks.get(block.id)!.base.title,
        rows: block.trackIds.flatMap((id) => (rows.has(id) ? [rows.get(id)!] : [])),
        end: header ? header.y + header.height : row!.y + row!.wrapperHeight,
      },
    ];
  });
}

export function getDragSourceBounds(blocks: DragBlock[], source: TrackMoveSource) {
  const block = blocks.find((block) =>
    source.kind === "set" ? block.trackSet?.id === source.id : block.trackIds.includes(source.id),
  );
  if (!block || block.pinned) return;
  if (source.kind === "set") return { y: block.y, height: block.end - block.y };

  const row = block.rows.find((row) => row.id === source.id);
  if (row) return { y: row.y, height: row.wrapperHeight };
}

export function getTrackDrop(
  blocks: DragBlock[],
  source: TrackMoveSource,
  y: number,
): TrackDrop | null {
  const drop = findTrackDrop(blocks, source, y);
  if (!drop || source.kind === "set") return drop;

  const sourceSet = blocks.find((block) => block.trackIds.includes(source.id))?.trackSet;
  const targetSet = blocks.find((block) => block.id === drop.destination.trackSetId)?.trackSet;
  return canTransferTrack(sourceSet, targetSet) ? drop : null;
}

function findTrackDrop(blocks: DragBlock[], source: TrackMoveSource, y: number): TrackDrop | null {
  for (const [index, block] of blocks.entries()) {
    if (y > block.end) continue;
    if (y < block.y) return outsideDrop(blocks, source, index);

    const edge = y < (block.y + block.end) / 2 ? index : index + 1;
    if (source.kind === "set") return outsideDrop(blocks, source, edge);
    if (block.pinned)
      return y >= block.end - TRACK_SET_EDGE_DROP_ZONE
        ? outsideDrop(blocks, source, index + 1)
        : null;
    if (!block.trackSet) return outsideDrop(blocks, source, edge);
    if (y <= block.y + TRACK_SET_EDGE_DROP_ZONE) return outsideDrop(blocks, source, index);
    if (block.rows.length && y >= block.end - TRACK_SET_EDGE_DROP_ZONE)
      return outsideDrop(blocks, source, index + 1);

    return insideDrop(block, y);
  }
  return outsideDrop(blocks, source, blocks.length);
}

function outsideDrop(
  blocks: DragBlock[],
  source: TrackMoveSource,
  index: number,
): TrackDrop | null {
  const next = blocks[index];
  if (next?.pinned) return null;

  return {
    destination: { beforeTrackId: next?.trackIds[0] },
    y: next?.y ?? blocks.at(-1)?.end ?? 0,
    label: source.kind === "set" ? "Move track set here" : "Move outside track sets",
  };
}

function insideDrop(block: DragBlock, y: number): TrackDrop | null {
  if (y < block.y + TRACK_SET_HEADER_HEIGHT) {
    return {
      destination: {
        trackSetId: block.id,
        beforeTrackId: block.rows.length ? block.trackIds[0] : undefined,
      },
      y: block.y + TRACK_SET_HEADER_HEIGHT,
      label: `Add to track set: ${block.title}`,
    };
  }

  const row = block.rows.find((row) => y <= row.y + row.wrapperHeight);
  if (!row) return null;
  const before = y < row.y + row.wrapperHeight / 2;
  return {
    destination: {
      trackSetId: block.id,
      beforeTrackId: before ? row.id : block.trackIds[block.trackIds.indexOf(row.id) + 1],
    },
    y: before ? row.y : row.y + row.wrapperHeight,
    label: `Move to track set: ${block.title}`,
  };
}
