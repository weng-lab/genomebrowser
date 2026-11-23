import type { AnyTrackInstance, TrackStoreInstance } from "@weng-lab/genomebrowser";
import {
  applyTrackSort,
  type TrackSortDirection,
  type TrackSortOption,
  type TrackSortRule,
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

/** Every field tracks can be sorted by. Every track has a title and a type. */
const trackSortFields: readonly TrackSortOption[] = [titleField, typeField];

/**
 * The fields the Sort tracks dialog offers for the given tracks. A field is offered
 * only when sorting by it could change the order, so Track type needs at least two
 * types among them.
 */
export function getTrackSortOptions(tracks: readonly AnyTrackInstance[]): TrackSortOption[] {
  const options = [titleField];
  if (new Set(tracks.map(({ type }) => type)).size > 1) options.push(typeField);
  return options;
}

/** One level of a sort by field ID. Ascending when no direction is given. */
export type TrackSortRequest = { field: string; direction?: TrackSortDirection };

type SortOutcome = { ok: true } | { ok: false; code: string; error: string };

/**
 * Sort the store's tracks once by the given fields in priority order, as the dialog's
 * Apply order does. Fails without changing the order when a field is unknown.
 */
export function sortTracks(
  trackStore: TrackStoreInstance,
  sort: readonly TrackSortRequest[],
): SortOutcome {
  const rules: TrackSortRule[] = [];
  const unknown: string[] = [];
  for (const { field, direction = "ascending" } of sort) {
    const option = trackSortFields.find(({ id }) => id === field);
    if (option) rules.push({ option, direction });
    else unknown.push(`"${field}"`);
  }
  if (unknown.length > 0) {
    const available = trackSortFields.map(({ id }) => `"${id}"`).join(", ");
    const error = `Unknown sort field ${unknown.join(", ")}. Available fields: ${available}`;
    return { ok: false, code: "UNKNOWN_SORT_FIELD", error };
  }
  return applyTrackSort(trackStore, rules);
}
