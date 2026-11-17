import { z } from "zod";
import type { AnyTrackInstance, TrackMutationResult } from "../../modules/types";

export type TrackSet = Readonly<{
  id: string;
  title: string;
  trackIds: readonly string[];
  visible: boolean;
}>;

export type TrackSetInput = Omit<TrackSet, "visible"> & { visible?: boolean };

export type TrackSetOrder = {
  order: readonly string[];
  trackSets: readonly TrackSet[];
  pinnedTrackIds: readonly string[];
};

/** One indivisible item in the top-level order: a track set or a standalone track. */
export type TrackBlock = {
  id: string;
  trackSet?: TrackSet;
  trackIds: string[];
  pinned: boolean;
};

const schema = z.strictObject({
  id: z.string().min(1),
  title: z.string().trim().min(1),
  trackIds: z.array(z.string().min(1)).min(1),
  visible: z.boolean().default(true),
});

export function parseTrackSet(input: TrackSetInput) {
  return schema.safeParse(input);
}

export function validateTrackSets(
  trackSets: readonly TrackSet[],
  tracks: readonly AnyTrackInstance[],
): TrackMutationResult {
  const trackIds = new Set(tracks.map((track) => track.base.id));
  const setIds = new Set<string>();
  const members = new Set<string>();

  for (const trackSet of trackSets) {
    if (setIds.has(trackSet.id) || trackIds.has(trackSet.id)) {
      return {
        ok: false,
        code: "INVALID_TRACK_SET",
        error: `Duplicate track set id: ${trackSet.id}`,
      };
    }
    setIds.add(trackSet.id);

    for (const id of trackSet.trackIds) {
      if (!trackIds.has(id)) {
        return { ok: false, code: "TRACK_NOT_FOUND", error: `No track found for id: ${id}` };
      }
      if (members.has(id)) {
        return {
          ok: false,
          code: "INVALID_TRACK_SET",
          error: `Track already belongs to a track set: ${id}`,
        };
      }
      members.add(id);
    }
  }
  return { ok: true };
}

/** Point lookups use this helper; bulk operations build the same index once. */
export function findTrackSet(trackId: string, trackSets: readonly TrackSet[]) {
  return trackSets.find((trackSet) => trackSet.trackIds.includes(trackId));
}

export function getTrackSet(id: string, trackSets: readonly TrackSet[]) {
  return trackSets.find((trackSet) => trackSet.id === id);
}

export function indexTrackSets(trackSets: readonly TrackSet[]) {
  const byTrackId = new Map<string, TrackSet>();
  for (const trackSet of trackSets) {
    for (const id of trackSet.trackIds) byTrackId.set(id, trackSet);
  }
  return byTrackId;
}

export function isTrackSetPinned(trackSet: TrackSet | undefined, pinned: ReadonlySet<string>) {
  return trackSet ? hasPinnedTrack(trackSet.trackIds, pinned) : false;
}

export function isTrackPinned(
  trackId: string,
  trackSets: readonly TrackSet[],
  pinnedTrackIds: readonly string[],
) {
  const pinned = new Set(pinnedTrackIds);
  return pinned.has(trackId) || isTrackSetPinned(findTrackSet(trackId, trackSets), pinned);
}

export function getToggledTrackPins(state: TrackSetOrder, trackIds: readonly string[]) {
  const members = new Set(trackIds);
  const pinned = new Set(state.pinnedTrackIds);
  if (hasPinnedTrack(trackIds, pinned)) {
    return state.pinnedTrackIds.filter((id) => !members.has(id));
  }
  return [...state.pinnedTrackIds, ...state.order.filter((id) => members.has(id))];
}

export function isTrackVisible(
  id: string,
  trackSets: readonly TrackSet[],
  hiddenIds: readonly string[],
) {
  return !hiddenIds.includes(id) && (findTrackSet(id, trackSets)?.visible ?? true);
}

/** Membership and pinning are resolved once, shared by ordering, movement and dragging. */
export function getTrackBlocks(state: TrackSetOrder): TrackBlock[] {
  const byTrackId = indexTrackSets(state.trackSets);
  const pinned = new Set(state.pinnedTrackIds);
  const blocks = new Map<string, TrackBlock>();

  for (const id of state.order) {
    const trackSet = byTrackId.get(id);
    const blockId = trackSet?.id ?? id;
    let block = blocks.get(blockId);
    if (!block) {
      block = {
        id: blockId,
        trackSet,
        trackIds: [],
        pinned: trackSet ? isTrackSetPinned(trackSet, pinned) : pinned.has(id),
      };
      blocks.set(blockId, block);
    }
    block.trackIds.push(id);
  }
  return [...blocks.values()];
}

export function retainTrackSets(
  trackSets: readonly TrackSet[],
  tracks: readonly AnyTrackInstance[],
) {
  const ids = new Set(tracks.map((track) => track.base.id));
  if (trackSets.every((trackSet) => trackSet.trackIds.every((id) => ids.has(id)))) return trackSets;

  return trackSets.flatMap((trackSet) => {
    const trackIds = trackSet.trackIds.filter((id) => ids.has(id));
    return trackIds.length ? [{ ...trackSet, trackIds }] : [];
  });
}

/** The same ordering path handles standalone tracks, track sets and reserved pin IDs. */
export function orderTrackSets(
  tracks: AnyTrackInstance[],
  pinnedTrackIds: readonly string[],
  trackSets: readonly TrackSet[],
) {
  const byId = new Map(tracks.map((track) => [track.base.id, track]));
  const pinOrder = new Map(pinnedTrackIds.map((id, index) => [id, index]));
  const blocks = getTrackBlocks({
    order: tracks.map((track) => track.base.id),
    trackSets,
    pinnedTrackIds,
  });
  const priority = new Map(
    blocks.map((block) => [
      block,
      block.trackIds.reduce((first, id) => Math.min(first, pinOrder.get(id) ?? Infinity), Infinity),
    ]),
  );

  blocks.sort((a, b) =>
    priority.get(a) === priority.get(b) ? 0 : priority.get(a)! - priority.get(b)!,
  );
  return blocks.flatMap((block) => block.trackIds.map((id) => byId.get(id)!));
}

export function isContiguousOrder(ids: readonly string[], trackSets: readonly TrackSet[]) {
  const byTrackId = indexTrackSets(trackSets);
  const completed = new Set<string>();
  let previous: string | undefined;

  for (const id of ids) {
    const current = byTrackId.get(id)?.id;
    if (current !== previous && previous !== undefined) completed.add(previous);
    if (current !== undefined && completed.has(current)) return false;
    previous = current;
  }
  return true;
}

function hasPinnedTrack(trackIds: readonly string[], pinned: ReadonlySet<string>) {
  return trackIds.some((id) => pinned.has(id));
}
