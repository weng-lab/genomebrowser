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

type SyncedBrowserKey = keyof Omit<SessionSnapshot["browser"], "assembly" | "region">;

/**
 * Browser fields synced by web clients. `region` is intentionally excluded: tabs
 * read the session's region on open and follow explicit server-side updates (such
 * as MCP `set_region`), while local panning and zooming stay tab-local.
 */
const syncedBrowserKeys: readonly SyncedBrowserKey[] = [
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
 * Whether a track's `base.height` is computed from rendered rows/viewport width
 * by its renderer (`useRowLayout` / `useAutoTrackHeight`). Syncing height alone
 * for these tracks would ping-pong between tabs at different widths.
 */
export function isDerivedHeightTrack(track: SessionSnapshot["tracks"][number]): boolean {
  return (
    track.type === "ruler" || track.type === "gene" || typeof track.config.rowHeight === "number"
  );
}

/**
 * Canonical JSON key for the synced parts of a session document. Excludes
 * tab-local `browser.region` and renderer-derived track heights so neither
 * marks a tab dirty or triggers writes.
 */
export function syncKey(doc: SessionDocument): string {
  const browser: Record<string, unknown> = {};
  for (const key of syncedBrowserKeys) {
    browser[key] = doc.snapshot.browser[key];
  }
  return JSON.stringify({
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

  const browserPatch: Partial<Omit<SessionSnapshot["browser"], "assembly" | "region">> = {};
  let browserChanged = false;
  for (const key of syncedBrowserKeys) {
    if (!jsonEqual(base.snapshot.browser[key], next.snapshot.browser[key])) {
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

  if (!jsonEqual(base.snapshot.pinnedTrackIds, next.snapshot.pinnedTrackIds)) {
    patch.pinnedTrackIds = next.snapshot.pinnedTrackIds;
    changed = true;
  }

  if (!jsonEqual(base.snapshot.regionGroups, next.snapshot.regionGroups)) {
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
    const left = a[i];
    const right = b[i];
    if (
      left.type !== right.type ||
      left.source !== right.source ||
      left.base.id !== right.base.id ||
      left.base.title !== right.base.title ||
      left.base.display !== right.base.display ||
      left.base.color !== right.base.color
    ) {
      return false;
    }
    if (!isDerivedHeightTrack(left) && left.base.height !== right.base.height) return false;
    if (!jsonEqual(left.config, right.config)) return false;
    if (!jsonEqual(left.metadata ?? null, right.metadata ?? null)) return false;
  }
  return true;
}

function jsonEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}
