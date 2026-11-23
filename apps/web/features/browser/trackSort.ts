import type { AnyTrackInstance, TrackStoreInstance } from "@weng-lab/genomebrowser";
import {
  applyTrackSort,
  type TrackSortDirection,
  type TrackSortOption,
  type TrackSortRule,
  type TrackSortValue,
} from "@weng-lab/genomebrowser-ui";

const titleField: TrackSortOption = {
  id: "title",
  label: "Title",
  value: (track) => track.base.title,
};

const typeField: TrackSortOption = {
  id: "type",
  label: "Track type",
  value: (track) => track.type,
};

/** A metadata field, named as typed. `meta:` IDs can't clash with `title` and `type`. */
const metadataField = (name: string): TrackSortOption => ({
  id: `meta:${name}`,
  label: name,
  // Only the track's own fields: every object inherits names such as `constructor`.
  value: ({ metadata }) => (metadata && Object.hasOwn(metadata, name) ? metadata[name] : undefined),
});

// Field names in natural order, ignoring case, as text values sort.
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** Every field the tracks can be sorted by: Title, Track type, then their metadata fields. */
function sortFields(tracks: readonly AnyTrackInstance[]) {
  const names = new Set(tracks.flatMap((track) => Object.keys(track.metadata ?? {})));
  return [titleField, typeField, ...[...names].toSorted(collator.compare).map(metadataField)];
}

/**
 * The fields the Sort tracks dialog offers for the session's tracks: Title, then each other
 * field whose sort could change the order. That takes at least two different values among
 * the unpinned tracks, since pinned tracks keep their positions. A track without the field
 * counts as one value, so a single tagged track is enough.
 */
export function getTrackSortOptions({
  tracks,
  pinnedTrackIds,
}: {
  tracks: readonly AnyTrackInstance[];
  pinnedTrackIds: readonly string[];
}): TrackSortOption[] {
  const pinned = new Set(pinnedTrackIds);
  const unpinned = tracks.filter((track) => !pinned.has(track.base.id));
  return sortFields(tracks).filter(
    (field) => field === titleField || distinctValues(unpinned, field) > 1,
  );
}

function distinctValues(tracks: readonly AnyTrackInstance[], field: TrackSortOption) {
  return new Set(tracks.map((track) => valueKey(field.value(track)))).size;
}

// `1` and `"1"` are different values, while `null` and a missing field both mean none.
function valueKey(value: TrackSortValue) {
  return value === null || value === undefined ? "none" : `${typeof value}:${value}`;
}

/** One level of a sort by field ID. Ascending when no direction is given. */
export type TrackSortRequest = { field: string; direction?: TrackSortDirection };

type SortOutcome = { ok: true } | { ok: false; code: string; error: string };

/**
 * Sort the store's tracks once by the given fields in priority order, as the dialog's
 * Apply order does. The fields are `title`, `type`, and `meta:<name>` for any metadata
 * field a loaded track has. Fails without changing the order when a field is unknown.
 */
export function sortTracks(
  trackStore: TrackStoreInstance,
  sort: readonly TrackSortRequest[],
): SortOutcome {
  const available = sortFields(trackStore.getState().tracks);
  const rules: TrackSortRule[] = [];
  const unknown: string[] = [];
  for (const { field, direction = "ascending" } of sort) {
    const option = available.find(({ id }) => id === field);
    if (option) rules.push({ option, direction });
    else unknown.push(`"${field}"`);
  }
  if (unknown.length > 0) {
    const ids = available.map(({ id }) => `"${id}"`).join(", ");
    const error = `Unknown sort field ${unknown.join(", ")}. Available fields: ${ids}`;
    return { ok: false, code: "UNKNOWN_SORT_FIELD", error };
  }
  return applyTrackSort(trackStore, rules);
}
