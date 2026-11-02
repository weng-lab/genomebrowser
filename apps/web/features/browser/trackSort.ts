import type { AnyTrackInstance } from "@weng-lab/genomebrowser";
import type { TrackSortOption } from "@weng-lab/genomebrowser-ui";

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

/**
 * What the given tracks can be sorted by. A field is offered only when sorting by
 * it could change the order, so Track type needs at least two types among them.
 */
export function getTrackSortOptions(tracks: readonly AnyTrackInstance[]): TrackSortField[] {
  const options = [titleField];
  if (new Set(tracks.map(({ type }) => type)).size > 1) options.push(typeField);
  return options;
}

/** Every unpinned track takes part in a sort; the dialog leaves pinned tracks in place. */
export const getTrackSortFields = (track: AnyTrackInstance) => track;
