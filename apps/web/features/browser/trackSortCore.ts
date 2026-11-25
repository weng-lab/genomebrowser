import type { MetadataRecord, MetadataValue } from "./trackMetadataCore";

export type SortDirection = "ascending" | "descending";
export type SortRequest = { field: string; direction?: SortDirection };

type SortableTrack = {
  type: string;
  base: { id: string; title: string };
  metadata?: MetadataRecord;
};

type SortValue = MetadataValue | undefined;

// Natural case-insensitive text order, shared across UI sort options and server MCP sort.
export const trackSortCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

/**
 * Pure, React-free track sort matching the Sort tracks dialog: pinned tracks keep
 * their positions at the top, missing values sort last in both directions, and ties
 * preserve existing order.
 */
export function sortTrackList<T extends SortableTrack>(
  tracks: readonly T[],
  pinnedTrackIds: readonly string[],
  by: readonly SortRequest[],
): { ok: true; tracks: T[] } | { ok: false; code: string; error: string } {
  const metaNames = new Set(tracks.flatMap((track) => Object.keys(track.metadata ?? {})));
  const available = new Map<string, (track: T) => SortValue>([
    ["title", (track) => track.base.title],
    ["type", (track) => track.type],
    ...[...metaNames]
      .toSorted(trackSortCollator.compare)
      .map((name): [string, (track: T) => SortValue] => [
        `meta:${name}`,
        ({ metadata }) => (metadata && Object.hasOwn(metadata, name) ? metadata[name] : undefined),
      ]),
  ]);

  const unknown = by.filter(({ field }) => !available.has(field)).map(({ field }) => `"${field}"`);
  if (unknown.length > 0) {
    const ids = [...available.keys()].map((id) => `"${id}"`).join(", ");
    return {
      ok: false,
      code: "UNKNOWN_SORT_FIELD",
      error: `Unknown sort field ${unknown.join(", ")}. Available fields: ${ids}`,
    };
  }

  const pinned = new Set(pinnedTrackIds);
  const pinnedTracks: T[] = [];
  const unpinnedTracks: { track: T; index: number }[] = [];

  for (const [index, track] of tracks.entries()) {
    if (pinned.has(track.base.id)) pinnedTracks.push(track);
    else unpinnedTracks.push({ track, index });
  }

  unpinnedTracks.sort((a, b) => {
    for (const { field, direction = "ascending" } of by) {
      const getter = available.get(field)!;
      const cmp = compareValues(getter(a.track), getter(b.track), direction);
      if (cmp !== 0) return cmp;
    }
    return a.index - b.index;
  });

  return { ok: true, tracks: [...pinnedTracks, ...unpinnedTracks.map(({ track }) => track)] };
}

function compareValues(a: SortValue, b: SortValue, direction: SortDirection): number {
  const aMissing = a === null || a === undefined;
  const bMissing = b === null || b === undefined;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  let cmp: number;
  if (typeof a === "number" && typeof b === "number") {
    cmp = a - b;
  } else if (typeof a === "boolean" && typeof b === "boolean") {
    cmp = Number(a) - Number(b);
  } else {
    cmp = trackSortCollator.compare(String(a), String(b));
  }
  return direction === "descending" ? -cmp : cmp;
}
