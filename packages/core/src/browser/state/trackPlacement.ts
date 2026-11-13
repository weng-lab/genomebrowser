import type { AnyTrackInstance, TrackMutationResult } from "../../modules/types";
import type { TrackSet } from "./trackSets";

export type TrackMoveSource = { kind: "track" | "set"; id: string };
/** Omit trackSetId for a standalone position; omit beforeTrackId to append. */
export type TrackMoveDestination = { trackSetId?: string; beforeTrackId?: string };
type PlacementState = {
  tracks: AnyTrackInstance[];
  order: string[];
  trackSets: readonly TrackSet[];
  pinnedTrackIds: readonly string[];
};
type PlacementResult =
  | Exclude<TrackMutationResult, { ok: true }>
  | { ok: true; state?: Pick<PlacementState, "tracks" | "order" | "trackSets"> };

/** Validate and compute the entire placement before publishing a store update. */
export function getTrackPlacement(
  state: PlacementState,
  source: TrackMoveSource,
  destination: TrackMoveDestination,
): PlacementResult {
  const owners = new Map(
    state.trackSets.flatMap((set) => set.trackIds.map((id) => [id, set] as const)),
  );
  const byId = new Map(state.tracks.map((track) => [track.base.id, track]));
  const sourceSet =
    source.kind === "set"
      ? state.trackSets.find((set) => set.id === source.id)
      : owners.get(source.id);
  if (source.kind === "set" ? !sourceSet : !byId.has(source.id))
    return {
      ok: false,
      code: source.kind === "set" ? "TRACK_SET_NOT_FOUND" : "TRACK_NOT_FOUND",
      error: "The moved item no longer exists.",
    };
  const target =
    destination.trackSetId === undefined
      ? undefined
      : state.trackSets.find((set) => set.id === destination.trackSetId);
  if (destination.trackSetId !== undefined && !target)
    return {
      ok: false,
      code: "TRACK_SET_NOT_FOUND",
      error: "The destination track set no longer exists.",
    };
  if (source.kind === "set" && target)
    return { ok: false, code: "INVALID_TRACK_SET", error: "Track sets cannot be nested." };
  const pinned = new Set(state.pinnedTrackIds);
  const moving = new Set(source.kind === "set" ? sourceSet!.trackIds : [source.id]);
  if (
    (source.kind === "track" && pinned.has(source.id)) ||
    sourceSet?.trackIds.some((id) => pinned.has(id)) ||
    target?.trackIds.some((id) => pinned.has(id))
  )
    return {
      ok: false,
      code: "INTERACTION_BLOCKED",
      error: "Unpin the track or track set before moving it.",
    };
  const before = destination.beforeTrackId;
  if (before !== undefined && !byId.has(before))
    return { ok: false, code: "TRACK_NOT_FOUND", error: "The destination track no longer exists." };
  if (target && before !== undefined && owners.get(before)?.id !== target.id)
    return {
      ok: false,
      code: "INVALID_TRACK_ORDER",
      error: "The insertion point must belong to the destination set.",
    };
  if (
    !target &&
    before !== undefined &&
    (pinned.has(before) || owners.get(before)?.trackIds.some((id) => pinned.has(id)))
  )
    return {
      ok: false,
      code: "INTERACTION_BLOCKED",
      error: "Tracks cannot be placed above pinned items.",
    };
  let anchorIndex = state.order.length;
  if (before !== undefined) {
    const anchorSet = !target ? owners.get(before) : undefined;
    anchorIndex = state.order.indexOf(before);
    if (anchorSet) anchorIndex = state.order.findIndex((id) => owners.get(id)?.id === anchorSet.id);
  } else if (target) {
    for (let index = 0; index < state.order.length; index++)
      if (owners.get(state.order[index])?.id === target.id) anchorIndex = index + 1;
  }
  // Find the next surviving anchor, including when the drop points at the source itself.
  const anchor = state.order.slice(anchorIndex).find((id) => !moving.has(id));
  const remaining = state.order.filter((id) => !moving.has(id));
  const index = anchor === undefined ? remaining.length : remaining.indexOf(anchor);
  const movedIds = state.order.filter((id) => moving.has(id));
  const order = [...remaining.slice(0, index), ...movedIds, ...remaining.slice(index)];
  const trackSets =
    source.kind === "set" || sourceSet?.id === target?.id
      ? state.trackSets
      : state.trackSets.flatMap((set) => {
          if (set.id === target?.id) return [{ ...set, trackIds: [...set.trackIds, source.id] }];
          if (set.id !== sourceSet?.id) return [set];
          const trackIds = set.trackIds.filter((id) => id !== source.id);
          return trackIds.length ? [{ ...set, trackIds }] : [];
        });
  if (trackSets === state.trackSets && order.every((id, index) => id === state.order[index]))
    return { ok: true };
  return { ok: true, state: { tracks: order.map((id) => byId.get(id)!), order, trackSets } };
}
