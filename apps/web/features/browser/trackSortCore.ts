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
// Matches `@weng-lab/genomebrowser-ui`'s `trackSortOrder.ts` when one field mixes value types.
const typeRank = { number: 0, string: 1, boolean: 2 } as const;

/**
 * Pure, React-free track sort matching `@weng-lab/genomebrowser-ui`'s `applyTrackSort`:
 * pinned tracks keep their exact slot indices, missing/NaN values sort last in both
 * directions, mixed value types rank number < string < boolean, and ties preserve order.
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
  const result = [...tracks];
  const unpinned: { track: T; index: number }[] = [];

  for (const [index, track] of tracks.entries()) {
    if (!pinned.has(track.base.id)) unpinned.push({ track, index });
  }
  const slots = unpinned.map(({ index }) => index);

  unpinned.sort((a, b) => {
    for (const { field, direction = "ascending" } of by) {
      const getter = available.get(field)!;
      const cmp = compareForRule(getter(a.track), getter(b.track), direction);
      if (cmp !== 0) return cmp;
    }
    return a.index - b.index;
  });

  unpinned.forEach(({ track }, position) => {
    result[slots[position]] = track;
  });

  return { ok: true, tracks: result };
}

function hasValue(value: SortValue): value is string | number | boolean {
  return value !== null && value !== undefined && !Number.isNaN(value);
}

function compareForRule(a: SortValue, b: SortValue, direction: SortDirection): number {
  if (!hasValue(a) || !hasValue(b)) return Number(hasValue(b)) - Number(hasValue(a));
  const cmp = compareValues(a, b);
  return direction === "descending" ? -cmp : cmp;
}

function compareValues(a: string | number | boolean, b: string | number | boolean): number {
  if (typeof a !== typeof b) {
    return (
      typeRank[typeof a as keyof typeof typeRank] - typeRank[typeof b as keyof typeof typeRank]
    );
  }
  if (typeof a === "string") return trackSortCollator.compare(a, b as string);
  return Number(a) - Number(b);
}
