import type { AnyTrackInstance, TrackMutationResult } from "../../modules/types";
import {
  getTrackBlocks,
  getTrackSet,
  indexTrackSets,
  isTrackSetPinned,
  type TrackSet,
  type TrackSetOrder,
} from "./trackSets";

export type TrackMoveSource = { kind: "track" | "set"; id: string };

/** Omit trackSetId for a standalone position; omit beforeTrackId to append. */
export type TrackMoveDestination = { trackSetId?: string; beforeTrackId?: string };

type PlacementState = TrackSetOrder & { tracks: AnyTrackInstance[]; order: string[] };
type PlacementFailure = Exclude<TrackMutationResult, { ok: true }>;
type PlacementResult =
  | PlacementFailure
  | { ok: true; state?: Pick<PlacementState, "tracks" | "order" | "trackSets"> };

type Placement = {
  state: PlacementState;
  source: TrackMoveSource;
  destination: TrackMoveDestination;
  tracksById: Map<string, AnyTrackInstance>;
  setsByTrackId: Map<string, TrackSet>;
  sourceSet?: TrackSet;
  targetSet?: TrackSet;
};

/** Validate, place, and change membership before publishing one atomic store update. */
export function getTrackPlacement(
  state: PlacementState,
  source: TrackMoveSource,
  destination: TrackMoveDestination,
): PlacementResult {
  const setsByTrackId = indexTrackSets(state.trackSets);
  const placement: Placement = {
    state,
    source,
    destination,
    setsByTrackId,
    tracksById: new Map(state.tracks.map((track) => [track.base.id, track])),
    sourceSet:
      source.kind === "set"
        ? getTrackSet(source.id, state.trackSets)
        : setsByTrackId.get(source.id),
    targetSet:
      destination.trackSetId === undefined
        ? undefined
        : getTrackSet(destination.trackSetId, state.trackSets),
  };
  const failure = validatePlacement(placement);
  if (failure) return failure;

  const moving = new Set(source.kind === "set" ? placement.sourceSet!.trackIds : [source.id]);
  const order = placeTrackIds(placement, moving);
  const trackSets = moveMembership(placement);
  if (trackSets === state.trackSets && order.every((id, index) => id === state.order[index]))
    return { ok: true };

  return {
    ok: true,
    state: { tracks: order.map((id) => placement.tracksById.get(id)!), order, trackSets },
  };
}

function validatePlacement(placement: Placement): PlacementFailure | undefined {
  const { state, source, destination, sourceSet, targetSet, tracksById } = placement;
  if (source.kind === "set" ? !sourceSet : !tracksById.has(source.id)) {
    return {
      ok: false,
      code: source.kind === "set" ? "TRACK_SET_NOT_FOUND" : "TRACK_NOT_FOUND",
      error: "The moved item no longer exists.",
    };
  }
  if (destination.trackSetId !== undefined && !targetSet) {
    return {
      ok: false,
      code: "TRACK_SET_NOT_FOUND",
      error: "The destination track set no longer exists.",
    };
  }
  if (source.kind === "set" && targetSet) {
    return { ok: false, code: "INVALID_TRACK_SET", error: "Track sets cannot be nested." };
  }

  const pinned = new Set(state.pinnedTrackIds);
  if (
    (source.kind === "track" && pinned.has(source.id)) ||
    isTrackSetPinned(sourceSet, pinned) ||
    isTrackSetPinned(targetSet, pinned)
  ) {
    return {
      ok: false,
      code: "INTERACTION_BLOCKED",
      error: "Unpin the track or track set before moving it.",
    };
  }
  return validateAnchor(placement, pinned);
}

function validateAnchor(
  { destination, targetSet, tracksById, setsByTrackId }: Placement,
  pinned: ReadonlySet<string>,
): PlacementFailure | undefined {
  const before = destination.beforeTrackId;
  if (before === undefined) return;
  if (!tracksById.has(before)) {
    return { ok: false, code: "TRACK_NOT_FOUND", error: "The destination track no longer exists." };
  }
  const anchorSet = setsByTrackId.get(before);
  if (targetSet && anchorSet?.id !== targetSet.id) {
    return {
      ok: false,
      code: "INVALID_TRACK_ORDER",
      error: "The insertion point must belong to the destination track set.",
    };
  }
  if (!targetSet && (pinned.has(before) || isTrackSetPinned(anchorSet, pinned))) {
    return {
      ok: false,
      code: "INTERACTION_BLOCKED",
      error: "Tracks cannot be placed above pinned items.",
    };
  }
}

function insertionIndex({ state, destination, targetSet, setsByTrackId }: Placement) {
  const before = destination.beforeTrackId;
  if (before !== undefined) {
    const anchorSet = !targetSet ? setsByTrackId.get(before) : undefined;
    return anchorSet
      ? state.order.findIndex((id) => setsByTrackId.get(id) === anchorSet)
      : state.order.indexOf(before);
  }
  if (targetSet) return state.order.findLastIndex((id) => setsByTrackId.get(id) === targetSet) + 1;
  return state.order.length;
}

function placeTrackIds(placement: Placement, moving: ReadonlySet<string>) {
  const { order } = placement.state;
  // A self-drop anchors at the next surviving track, preserving relative order.
  const anchor = order.slice(insertionIndex(placement)).find((id) => !moving.has(id));
  const remaining = order.filter((id) => !moving.has(id));
  const index = anchor === undefined ? remaining.length : remaining.indexOf(anchor);
  const moved = order.filter((id) => moving.has(id));
  return [...remaining.slice(0, index), ...moved, ...remaining.slice(index)];
}

function moveMembership({ state, source, sourceSet, targetSet }: Placement) {
  if (source.kind === "set" || sourceSet?.id === targetSet?.id) return state.trackSets;

  return state.trackSets.flatMap((trackSet) => {
    if (trackSet === targetSet)
      return [{ ...trackSet, trackIds: [...trackSet.trackIds, source.id] }];
    if (trackSet !== sourceSet) return [trackSet];
    const trackIds = trackSet.trackIds.filter((id) => id !== source.id);
    return trackIds.length ? [{ ...trackSet, trackIds }] : [];
  });
}

export function getTrackSetMovement(state: TrackSetOrder, id: string) {
  const blocks = getTrackBlocks(state);
  const index = blocks.findIndex((block) => block.trackSet?.id === id);
  if (index < 0) return;

  const block = blocks[index];
  const previous = blocks[index - 1];
  const next = blocks[index + 1];
  return {
    pinned: block.pinned,
    previous,
    next,
    canMoveUp: !block.pinned && !!previous && !previous.pinned,
    canMoveDown: !block.pinned && !!next && !next.pinned,
  };
}

export function getAdjacentTrackSetPlacement(
  state: PlacementState,
  id: string,
  direction: "up" | "down",
): PlacementResult {
  const movement = getTrackSetMovement(state, id);
  if (!movement)
    return { ok: false, code: "TRACK_SET_NOT_FOUND", error: `No track set found for id: ${id}` };
  if (movement.pinned)
    return {
      ok: false,
      code: "INTERACTION_BLOCKED",
      error: "Unpin the track set before moving it.",
    };
  if (direction === "up" ? !movement.canMoveUp : !movement.canMoveDown) return { ok: true };

  const neighbor = direction === "up" ? movement.previous! : movement.next!;
  const beforeTrackId =
    direction === "up"
      ? neighbor.trackIds[0]
      : state.order[state.order.indexOf(neighbor.trackIds.at(-1)!) + 1];
  return getTrackPlacement(state, { kind: "set", id }, { beforeTrackId });
}
