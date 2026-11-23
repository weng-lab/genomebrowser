import type {
  AnyTrackInstance,
  TrackMutationResult,
  TrackStoreInstance,
} from "@weng-lab/genomebrowser";

/** A value a track is sorted by. `null`, `undefined`, and `NaN` mean the track has none. */
export type TrackSortValue = string | number | boolean | null | undefined;

/** One field people can sort tracks by. */
export type TrackSortOption = {
  /** Unique within the dialog's options; used to remember the applied sort. */
  id: string;
  label: string;
  /** Reads the value this option sorts a track by. */
  value: (track: AnyTrackInstance) => TrackSortValue;
};

export type TrackSortDirection = "ascending" | "descending";

/** One level of a sort: an option and the direction it orders tracks in. */
export type TrackSortRule = { option: TrackSortOption; direction: TrackSortDirection };

// Natural, case-insensitive order, so "rep2" sorts before "rep10".
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
// Where each type sorts when one field mixes them, in ascending order.
const typeRank = { number: 0, string: 1, boolean: 2 } as const;

/**
 * Sorts the store's tracks once and commits the order. The first rule orders the tracks,
 * and each later rule breaks ties left by the ones before it. Pinned tracks keep their
 * positions, and the other tracks are rearranged among the positions they already hold.
 * Tracks without a value for a rule go after the tracks with one, in either direction.
 * Tracks that tie on every rule keep their current order. Returns `reorderTracks`' result.
 */
export function applyTrackSort(
  trackStore: TrackStoreInstance,
  rules: readonly TrackSortRule[],
): TrackMutationResult {
  const { tracks, pinnedTrackIds, reorderTracks } = trackStore.getState();
  return reorderTracks(sortedTrackIds(tracks, pinnedTrackIds, rules));
}

function sortedTrackIds(
  tracks: readonly AnyTrackInstance[],
  pinnedTrackIds: readonly string[],
  rules: readonly TrackSortRule[],
): string[] {
  const pinned = new Set(pinnedTrackIds);
  const ids = tracks.map((track) => track.base.id);
  const sortable = tracks.flatMap((track, index) =>
    pinned.has(track.base.id)
      ? []
      : [{ id: track.base.id, index, values: rules.map(({ option }) => option.value(track)) }],
  );
  const slots = sortable.map(({ index }) => index);
  // Array sorting is stable, so tracks that tie on every rule keep their current order.
  sortable.sort((a, b) => {
    for (const [level, { direction }] of rules.entries()) {
      const comparison = compareForRule(a.values[level], b.values[level], direction);
      if (comparison !== 0) return comparison;
    }
    return 0;
  });
  sortable.forEach(({ id }, position) => {
    ids[slots[position]] = id;
  });
  return ids;
}

function compareForRule(a: TrackSortValue, b: TrackSortValue, direction: TrackSortDirection) {
  // Missing values stay last whichever way the rule orders, as in spreadsheets.
  if (!hasValue(a) || !hasValue(b)) return Number(hasValue(b)) - Number(hasValue(a));
  const comparison = compareValues(a, b);
  return direction === "descending" ? -comparison : comparison;
}

/** NaN counts as no value: compared as a number, it would leave the whole sort inconsistent. */
function hasValue(value: TrackSortValue): value is string | number | boolean {
  return value != null && !Number.isNaN(value);
}

function compareValues(a: string | number | boolean, b: string | number | boolean) {
  if (typeof a !== typeof b) return typeRank[typeOf(a)] - typeRank[typeOf(b)];
  if (typeof a === "string") return collator.compare(a, b as string);
  // Numbers order numerically, and false comes before true.
  return Number(a) - Number(b);
}

function typeOf(value: string | number | boolean) {
  return typeof value as keyof typeof typeRank;
}
