import { z } from "zod";
import { regionGroupSchema } from "../browser/regions/regionGroupSchema";
import { normalizeGroups } from "../browser/regions/regionGroups";
import { sessionIdSchema, sessionInputSchema } from "./schema";
import { sessionSnapshotSchema, type SessionSnapshot } from "./snapshot.ts";

/** Normalized session state (`name` + parsed `SessionSnapshot`). */
export type SessionDocument = {
  name: string;
  snapshot: SessionSnapshot;
};

/**
 * Partial session edit derived directly from `sessionSnapshotSchema` and
 * `sessionInputSchema`. Only changed fields are sent so concurrent edits to
 * different parts of a session (e.g. tracks vs. highlights vs. name) merge cleanly.
 */
export const sessionPatchSchema = z.strictObject({
  name: sessionInputSchema.shape.name.optional(),
  browser: sessionSnapshotSchema.shape.browser.omit({ assembly: true }).partial().optional(),
  tracks: sessionSnapshotSchema.shape.tracks.optional(),
  pinnedTrackIds: sessionSnapshotSchema.shape.pinnedTrackIds.optional(),
  // Avoid `.default([])` from `sessionSnapshotSchema`, which would wipe `regionGroups` on unrelated patches.
  regionGroups: z.array(regionGroupSchema).optional(),
});
export type SessionPatch = z.infer<typeof sessionPatchSchema>;

/** What a tab sends to apply a partial live edit to a session. */
export const sessionPatchRequestSchema = z.strictObject({
  clientId: z.uuid(),
  saveId: z.uuid(),
  patch: sessionPatchSchema,
});
export type SessionPatchRequest = z.infer<typeof sessionPatchRequestSchema>;

/**
 * Real-time session event published through the SessionBus and streamed via SSE.
 * `updated` carries only a lightweight revision hint so Redis pub/sub stays tiny;
 * clients fetch the latest session state when `revision` is newer than theirs.
 */
export const sessionEventSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("updated"),
    revision: z.number().int().positive(),
    sourceClientId: z.uuid().optional(),
  }),
  z.strictObject({
    type: z.literal("deleted"),
    sessionId: sessionIdSchema,
  }),
]);
export type SessionEvent = z.infer<typeof sessionEventSchema>;

export type SyncedBrowserKey = keyof Omit<SessionSnapshot["browser"], "assembly">;

/** Browser fields synced by web clients (everything except immutable `assembly`). */
export const syncedBrowserKeys: readonly SyncedBrowserKey[] = [
  "region",
  "basePairDetail",
  "marginWidth",
  "trackWidth",
  "fontSize",
  "titleSize",
  "highlights",
  "selectionMode",
  "selectionHighlight",
];

/**
 * Structural track shape shared by both serialized snapshot tracks and live
 * `AnyTrackInstance` entries in the track store.
 */
export type SyncComparableTrack = {
  type: string;
  source?: string;
  base: {
    id: string;
    title: string;
    display: string;
    color?: string;
    height: number;
  };
  config: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

/**
 * Whether a track's `base.height` is computed from rendered rows/viewport width
 * by its renderer (`useRowLayout` / `useAutoTrackHeight`). Syncing height alone
 * for these tracks would ping-pong between tabs at different widths.
 */
export function isDerivedHeightTrack(track: Pick<SyncComparableTrack, "type" | "config">): boolean {
  return (
    track.type === "ruler" || track.type === "gene" || typeof track.config.rowHeight === "number"
  );
}

/**
 * Order-insensitive deep equality for JSON-compatible values. PostgreSQL `jsonb`
 * reorders object keys, so comparing `JSON.stringify` directly would produce
 * false mismatches on multi-key track configs and metadata.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const leftKeys = Object.keys(left).filter((key) => left[key] !== undefined);
  const rightKeys = Object.keys(right).filter((key) => right[key] !== undefined);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!Object.hasOwn(right, key) || !deepEqual(left[key], right[key])) return false;
  }
  return true;
}

/** Whether two tracks have identical synced fields (ignoring renderer-derived heights and key order). */
export function sameTrackForSync(a: SyncComparableTrack, b: SyncComparableTrack): boolean {
  if (
    a.type !== b.type ||
    a.source !== b.source ||
    a.base.id !== b.base.id ||
    a.base.title !== b.base.title ||
    a.base.display !== b.base.display ||
    a.base.color !== b.base.color
  ) {
    return false;
  }
  if (!isDerivedHeightTrack(b) && a.base.height !== b.base.height) return false;
  if (!deepEqual(a.config, b.config)) return false;
  return deepEqual(a.metadata ?? null, b.metadata ?? null);
}

/**
 * Canonical, key-order-insensitive JSON key for the synced parts of a session
 * document. Excludes renderer-derived track heights so viewport-width
 * differences and PostgreSQL `jsonb` key reordering do not mark a tab dirty.
 */
export function syncKey(doc: SessionDocument): string {
  const browser: Record<string, unknown> = {};
  for (const key of syncedBrowserKeys) {
    browser[key] = doc.snapshot.browser[key];
  }
  return canonicalJson({
    name: doc.name,
    browser,
    tracks: doc.snapshot.tracks.map((track) =>
      isDerivedHeightTrack(track) ? { ...track, base: { ...track.base, height: 0 } } : track,
    ),
    pinnedTrackIds: doc.snapshot.pinnedTrackIds,
    regionGroups: doc.snapshot.regionGroups,
  });
}

/**
 * Compare two snapshots/names and produce the smallest `SessionPatch` describing
 * what synced fields changed, or `undefined` when nothing synced changed.
 */
export function diffSessionPatch(
  base: SessionDocument,
  next: SessionDocument,
): SessionPatch | undefined {
  const patch: SessionPatch = {};
  let changed = false;

  if (base.name !== next.name) {
    patch.name = next.name;
    changed = true;
  }

  const browserPatch: Partial<Omit<SessionSnapshot["browser"], "assembly">> = {};
  let browserChanged = false;
  for (const key of syncedBrowserKeys) {
    if (!deepEqual(base.snapshot.browser[key], next.snapshot.browser[key])) {
      (browserPatch as Record<string, unknown>)[key] = next.snapshot.browser[key];
      browserChanged = true;
    }
  }
  if (browserChanged) {
    patch.browser = browserPatch;
    changed = true;
  }

  if (!tracksEqualForSync(base.snapshot.tracks, next.snapshot.tracks)) {
    patch.tracks = next.snapshot.tracks;
    changed = true;
  }

  if (!deepEqual(base.snapshot.pinnedTrackIds, next.snapshot.pinnedTrackIds)) {
    patch.pinnedTrackIds = next.snapshot.pinnedTrackIds;
    changed = true;
  }

  if (!deepEqual(base.snapshot.regionGroups, next.snapshot.regionGroups)) {
    patch.regionGroups = next.snapshot.regionGroups;
    changed = true;
  }

  return changed ? patch : undefined;
}

/** Apply a validated `SessionPatch` onto the latest server session state. */
export function applySessionPatch(
  current: { name: string; snapshot: SessionSnapshot },
  patch: SessionPatch,
): { name: string; snapshot: SessionSnapshot } {
  const name = patch.name ?? current.name;
  const browser = patch.browser
    ? { ...current.snapshot.browser, ...patch.browser, assembly: current.snapshot.browser.assembly }
    : current.snapshot.browser;
  const tracks = patch.tracks ?? current.snapshot.tracks;
  const pinnedTrackIds = patch.pinnedTrackIds ?? current.snapshot.pinnedTrackIds;
  const rawGroups = patch.regionGroups ?? current.snapshot.regionGroups;
  const regionGroups =
    patch.browser?.highlights !== undefined || patch.regionGroups !== undefined
      ? normalizeGroups(
          rawGroups,
          browser.highlights.map((highlight) => highlight.id),
        )
      : rawGroups;

  const snapshot = sessionSnapshotSchema.parse({
    version: 1,
    browser,
    tracks,
    pinnedTrackIds,
    regionGroups,
  });

  return { name, snapshot };
}

function tracksEqualForSync(a: SessionSnapshot["tracks"], b: SessionSnapshot["tracks"]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!sameTrackForSync(a[i], b[i])) return false;
  }
  return true;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => (item === undefined ? "null" : canonicalJson(item))).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .toSorted()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
  return `{${entries.join(",")}}`;
}
