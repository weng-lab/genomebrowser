import type { AnyTrackInstance, TrackStoreInstance } from "@weng-lab/genomebrowser";
import { getSortedTrackIds, type TrackSortOption } from "@weng-lab/genomebrowser-ui";

type TrackSortField = TrackSortOption<AnyTrackInstance>;

// Natural, case-insensitive order, so "rep2" sorts before "rep10".
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

const titleField: TrackSortField = {
  id: "title",
  label: "Title",
  compare: (a, b) => collator.compare(a.base.title, b.base.title),
};

const typeField: TrackSortField = {
  id: "type",
  label: "Track type",
  compare: (a, b) => collator.compare(a.type, b.type),
};

/** Every field tracks can be sorted by. Every track has a title and a type. */
const trackSortFields: readonly TrackSortField[] = [titleField, typeField];

/**
 * The fields the Sort tracks dialog offers for the given tracks. A field is offered
 * only when sorting by it could change the order, so Track type needs at least two
 * types among them.
 */
export function getTrackSortOptions(tracks: readonly AnyTrackInstance[]): TrackSortField[] {
  const options = [titleField];
  if (new Set(tracks.map(({ type }) => type)).size > 1) options.push(typeField);
  return options;
}

/** Every unpinned track takes part in a sort; pinned tracks keep their positions. */
export const getTrackSortValues = (track: AnyTrackInstance) => track;

type SortOutcome = { ok: true } | { ok: false; code: string; error: string };

/**
 * Sort the store's tracks once by the given field IDs in priority order, as the
 * dialog's Apply order does. Fails without changing the order when a field is unknown.
 */
export function sortTracks(
  trackStore: TrackStoreInstance,
  fieldIds: readonly string[],
): SortOutcome {
  const fields = fieldIds.map((id) => trackSortFields.find((field) => field.id === id));
  const unknown = fieldIds.filter((_, index) => !fields[index]);
  if (unknown.length > 0) {
    const available = trackSortFields.map(({ id }) => `"${id}"`).join(", ");
    const error = `Unknown sort field ${unknown.map((id) => `"${id}"`).join(", ")}. Available fields: ${available}`;
    return { ok: false, code: "UNKNOWN_SORT_FIELD", error };
  }
  const { tracks, pinnedTrackIds, reorderTracks } = trackStore.getState();
  const comparators = fields.map((field) => field!.compare);
  return reorderTracks(getSortedTrackIds(tracks, pinnedTrackIds, getTrackSortValues, comparators));
}
