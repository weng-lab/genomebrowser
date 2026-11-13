import { z } from "zod";
import type { AnyTrackInstance, TrackMutationResult } from "../../modules/types";

export type TrackSet = Readonly<{
  id: string;
  title: string;
  trackIds: readonly string[];
  visible: boolean;
}>;
export type TrackSetInput = Omit<TrackSet, "visible"> & { visible?: boolean };
export type TrackSetSettingsProps = { trackSetId: string; closeSettings: () => void };
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
  sets: readonly TrackSet[],
  tracks: readonly AnyTrackInstance[],
): TrackMutationResult {
  const trackIds = new Set(tracks.map((track) => track.base.id));
  const ids = new Set<string>();
  const members = new Set<string>();
  for (const set of sets) {
    if (ids.has(set.id) || trackIds.has(set.id))
      return { ok: false, code: "INVALID_TRACK_SET", error: `Duplicate track set id: ${set.id}` };
    ids.add(set.id);
    for (const id of set.trackIds) {
      if (!trackIds.has(id))
        return { ok: false, code: "TRACK_NOT_FOUND", error: `No track found for id: ${id}` };
      if (members.has(id))
        return {
          ok: false,
          code: "INVALID_TRACK_SET",
          error: `Track already belongs to a set: ${id}`,
        };
      members.add(id);
    }
  }
  return { ok: true };
}
export function findTrackSet(id: string, sets: readonly TrackSet[]) {
  return sets.find((set) => set.trackIds.includes(id));
}
export function isTrackVisible(
  id: string,
  sets: readonly TrackSet[],
  hiddenIds: readonly string[],
) {
  return !hiddenIds.includes(id) && (findTrackSet(id, sets)?.visible ?? true);
}
export function retainTrackSets(sets: readonly TrackSet[], tracks: readonly AnyTrackInstance[]) {
  const ids = new Set(tracks.map((track) => track.base.id));
  if (sets.every((set) => set.trackIds.every((id) => ids.has(id)))) return sets;
  return sets.flatMap((set) => {
    const trackIds = set.trackIds.filter((id) => ids.has(id));
    return trackIds.length ? [{ ...set, trackIds }] : [];
  });
}
/** The track array owns display order; set IDs describe membership only. */
export function orderTrackSets(
  tracks: AnyTrackInstance[],
  pinnedIds: readonly string[],
  sets: readonly TrackSet[],
) {
  const remaining = new Map(tracks.map((track) => [track.base.id, track]));
  const byTrack = new Map<string, TrackSet>();
  for (const set of sets) for (const id of set.trackIds) byTrack.set(id, set);
  const ordered: AnyTrackInstance[] = [];
  for (const id of [...pinnedIds, ...tracks.map((track) => track.base.id)]) {
    if (!remaining.has(id)) continue;
    const group = byTrack.get(id);
    const members = group
      ? tracks.filter((track) => byTrack.get(track.base.id) === group)
      : [remaining.get(id)!];
    for (const track of members) if (remaining.delete(track.base.id)) ordered.push(track);
  }
  return ordered;
}
export function isContiguousOrder(ids: readonly string[], sets: readonly TrackSet[]) {
  return sets.every((set) => {
    const positions = ids.flatMap((id, index) => (set.trackIds.includes(id) ? [index] : []));
    return !positions.length || positions.at(-1)! - positions[0] + 1 === positions.length;
  });
}
