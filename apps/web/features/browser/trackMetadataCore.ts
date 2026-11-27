import { maxSessionBytes, maxSessionTracks } from "../sessions/schema";

export type MetadataValue = string | number | boolean | null;
export type MetadataRecord = Record<string, MetadataValue>;

/**
 * Most metadata one track may have after a change, in bytes of JSON. A session's most tracks
 * at this size fill half of what it can save, so metadata alone can't stop it saving.
 */
export const maxTrackMetadataBytes = Math.floor(maxSessionBytes / maxSessionTracks / 2);

/** Fields to add or replace, and field names to remove. A track's other fields stay. */
export type TrackMetadataChange = {
  set?: Readonly<MetadataRecord>;
  remove?: readonly string[];
};

export type TrackMetadataOutcome =
  | { ok: true; tracks: { id: string; metadata: MetadataRecord }[] }
  | { ok: false; code: string; error: string };

/** The size of a metadata record as JSON, in bytes, which `maxTrackMetadataBytes` limits. */
export function metadataBytes(metadata: Readonly<MetadataRecord>): number {
  return new TextEncoder().encode(JSON.stringify(metadata)).length;
}

/**
 * Validate and compute updated metadata records for `trackIds` (pure and React-free,
 * shared between the browser track store and server-side MCP execution).
 */
export function planTrackMetadataChange<
  T extends { base: { id: string }; metadata?: MetadataRecord },
>(
  tracks: readonly T[],
  trackIds: readonly string[],
  change: TrackMetadataChange,
): TrackMetadataOutcome {
  const byId = new Map(tracks.map((track) => [track.base.id, track] as const));
  const missing = trackIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    const ids = missing.map((id) => `"${id}"`).join(", ");
    return { ok: false, code: "TRACK_NOT_FOUND", error: `No loaded track has the ID ${ids}` };
  }
  const planned = trackIds.map((id) => ({
    id,
    metadata: applyChange(byId.get(id)!.metadata, change),
  }));
  const tooLarge = planned.filter(
    ({ metadata }) => metadataBytes(metadata) > maxTrackMetadataBytes,
  );
  if (tooLarge.length > 0) {
    const ids = tooLarge.map(({ id }) => `"${id}"`).join(", ");
    return {
      ok: false,
      code: "METADATA_TOO_LARGE",
      error: `This change would give ${ids} more than ${maxTrackMetadataBytes.toLocaleString("en-US")} bytes of metadata per track. Remove fields or shorten values. No track changed.`,
    };
  }
  return { ok: true, tracks: planned };
}

function applyChange(
  current: MetadataRecord | undefined,
  { set = {}, remove = [] }: TrackMetadataChange,
): MetadataRecord {
  const removed = new Set(remove);
  return Object.fromEntries(
    Object.entries({ ...current, ...set }).filter(([field]) => !removed.has(field)),
  );
}
