import type { AnyTrackInstance } from "@weng-lab/genomebrowser";

/** One criterion people can include in, exclude from, and prioritize within a track sort. */
export type TrackSortOption<Metadata> = {
  /** Unique within the dialog's options; used to remember the applied priority. */
  id: string;
  label: string;
  /** Returns a negative number when `a` belongs above `b`, a positive number when below, or 0 on a tie. */
  compare: (a: Metadata, b: Metadata) => number;
};

export type TrackSortComparator<Metadata> = TrackSortOption<Metadata>["compare"];

/**
 * Returns every current track ID with the sortable tracks reordered. Sortable
 * tracks are unpinned tracks with metadata; they are rearranged among the
 * positions they already occupy, so pinned tracks and tracks without metadata
 * keep their places.
 */
export function getSortedTrackIds<Metadata>(
  tracks: readonly AnyTrackInstance[],
  pinnedTrackIds: readonly string[],
  getMetadata: (track: AnyTrackInstance) => Metadata | undefined,
  comparators: readonly TrackSortComparator<Metadata>[],
): string[] {
  const pinned = new Set(pinnedTrackIds);
  const sortable: Array<{ id: string; index: number; metadata: Metadata }> = [];
  const ids = tracks.map((track, index) => {
    const id = track.base.id;
    const metadata = pinned.has(id) ? undefined : getMetadata(track);
    if (metadata !== undefined) sortable.push({ id, index, metadata });
    return id;
  });

  const slots = sortable.map(({ index }) => index);
  // Array sorting is stable, so tracks that tie on every comparator keep their current order.
  sortable.sort((a, b) => {
    for (const compare of comparators) {
      const comparison = compare(a.metadata, b.metadata);
      if (comparison !== 0) return comparison;
    }
    return 0;
  });
  sortable.forEach(({ id }, position) => {
    ids[slots[position]] = id;
  });
  return ids;
}
