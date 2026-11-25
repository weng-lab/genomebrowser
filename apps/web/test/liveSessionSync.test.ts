import { hg38, normalizeRegion } from "@weng-lab/genomebrowser";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRedisConnection, type RedisConnection } from "../composition/server/redis";
import { createStores } from "../features/assemblies/assemblies";
import { assemblyChromosomes, normalizeAssemblyRegion } from "../features/assemblies/regions";
import { runServerStateCommand } from "../features/agent/server/stateCommands";
import {
  createMemorySessionBus,
  createRedisSessionBus,
  type SessionBus,
} from "../features/sessions/server/bus";
import { openSessionEventStream } from "../features/sessions/server/http";
import { createSessionService } from "../features/sessions/server/service";
import {
  maxRecentSaveIds,
  SessionError,
  type Sessions,
} from "../features/sessions/server/sessions";
import type {
  SavedSession,
  Session,
  SessionInput,
  SessionUpdate,
} from "../features/sessions/schema";
import { sessionSnapshotSchema, type SessionSnapshot } from "../features/sessions/snapshot.ts";
import { applyRemoteSnapshot, snapshot } from "../features/sessions/storeSnapshot";
import { diffSessionPatch, syncKey, type SessionEvent } from "../features/sessions/syncSchema";
import { testNamespace, testRedisUrl } from "./redis";

/** Pure in-memory `Sessions` repository matching PostgreSQL's `recent_save_ids` contract. */
function createMemorySessions(): Sessions & { loadCount: number } {
  const rows = new Map<string, SavedSession & { recentSaveIds: string[] }>();
  let loadCount = 0;

  const meta = (row: SavedSession): Session => ({
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    revision: row.revision,
    assembly: row.assembly,
    trackCount: row.trackCount,
  });

  const strip = ({
    recentSaveIds: _recent,
    ...saved
  }: SavedSession & { recentSaveIds: string[] }) => saved;

  function writeUpdate(
    id: string,
    input: SessionUpdate,
    { allowInterveningRetry }: { allowInterveningRetry: boolean },
  ): { session: SavedSession; applied: boolean } {
    const row = rows.get(id);
    if (!row) throw new SessionError("NOT_FOUND", "Session not found");
    const duplicate = allowInterveningRetry
      ? row.recentSaveIds.includes(input.saveId)
      : row.recentSaveIds.at(-1) === input.saveId && row.revision === input.revision + 1;
    if (duplicate) return { session: strip(row), applied: false };
    if (row.revision !== input.revision) throw new SessionError("CONFLICT", "Conflict");
    const parsed = sessionSnapshotSchema.parse(input.snapshot);
    const next: SavedSession & { recentSaveIds: string[] } = {
      ...row,
      name: input.name,
      snapshot: parsed,
      revision: row.revision + 1,
      trackCount: parsed.tracks.length,
      updatedAt: new Date(),
      recentSaveIds: [...row.recentSaveIds, input.saveId].slice(-maxRecentSaveIds),
    };
    rows.set(id, next);
    return { session: strip(next), applied: true };
  }

  return {
    get loadCount() {
      return loadCount;
    },
    async create(input: SessionInput) {
      const id = crypto.randomUUID();
      const now = new Date();
      const parsed = sessionSnapshotSchema.parse(input.snapshot);
      const row: SavedSession & { recentSaveIds: string[] } = {
        id,
        name: input.name,
        createdAt: now,
        updatedAt: now,
        revision: 1,
        assembly: parsed.browser.assembly,
        trackCount: parsed.tracks.length,
        snapshot: parsed,
        recentSaveIds: [],
      };
      rows.set(id, row);
      return meta(row);
    },
    async list() {
      return [...rows.values()].map(meta).sort((a, b) => a.name.localeCompare(b.name));
    },
    async load(id) {
      loadCount += 1;
      const row = rows.get(id);
      if (!row) throw new SessionError("NOT_FOUND", "Session not found");
      return strip(row);
    },
    async update(id, input: SessionUpdate) {
      const { session } = writeUpdate(id, input, { allowInterveningRetry: false });
      return meta(session);
    },
    async commit(id, input: SessionUpdate) {
      return writeUpdate(id, input, { allowInterveningRetry: true });
    },
    async remove(id) {
      if (!rows.delete(id)) throw new SessionError("NOT_FOUND", "Session not found");
    },
    async authorize(id) {
      if (!rows.has(id)) throw new SessionError("NOT_FOUND", "Session not found");
    },
  };
}

function defaultSnapshot(): SessionSnapshot {
  return snapshot(createStores("hg38")!);
}

function createEventCollector() {
  const queue: SessionEvent[] = [];
  const waiters: ((event: SessionEvent) => void)[] = [];
  return {
    push(event: SessionEvent) {
      const waiter = waiters.shift();
      if (waiter) waiter(event);
      else queue.push(event);
    },
    next(): Promise<SessionEvent> {
      const queued = queue.shift();
      if (queued) return Promise.resolve(queued);
      return new Promise<SessionEvent>((resolve) => {
        waiters.push(resolve);
      });
    },
  };
}

describe("live session sync (SessionService + MemorySessionBus)", () => {
  it("reads from PostgreSQL, merges concurrent patches cleanly, and broadcasts lightweight revision hints", async () => {
    const sessions = createMemorySessions();
    const bus = createMemorySessionBus();
    const service = createSessionService({ sessions, bus });

    const created = await service.create({ name: "Live test", snapshot: defaultSnapshot() });
    const loaded = await service.load(created.id);
    expect(loaded.revision).toBe(1);
    expect(sessions.loadCount).toBe(1);

    // Subscribe two tabs at revision 1.
    const tabA = new AbortController();
    const tabB = new AbortController();
    const eventsA = createEventCollector();
    const eventsB = createEventCollector();
    await service.subscribe(created.id, eventsA.push, tabA.signal, { sinceRevision: 1 });
    await service.subscribe(created.id, eventsB.push, tabB.signal, { sinceRevision: 1 });

    const clientA = crypto.randomUUID();
    const clientB = crypto.randomUUID();
    const nextA = eventsA.next();
    const nextB = eventsB.next();

    // Tab A changes fontSize; Tab B renames concurrently.
    const [patchedA, patchedB] = await Promise.all([
      service.patch(created.id, {
        clientId: clientA,
        saveId: crypto.randomUUID(),
        patch: { browser: { fontSize: 16 } },
      }),
      service.patch(created.id, {
        clientId: clientB,
        saveId: crypto.randomUUID(),
        patch: { name: "Renamed live" },
      }),
    ]);

    expect([patchedA.revision, patchedB.revision].sort((a, b) => a - b)).toEqual([2, 3]);
    const final = await service.load(created.id);
    expect(final.name).toBe("Renamed live");
    expect(final.snapshot.browser.fontSize).toBe(16);

    // Both subscribers receive lightweight revision hints (no snapshot payload).
    const [evtA, evtB] = await Promise.all([nextA, nextB]);
    expect(evtA).toMatchObject({ type: "updated", revision: expect.any(Number) });
    expect("session" in evtA).toBe(false);
    expect(evtB.type).toBe("updated");

    // Catch-up subscription sends a revision hint when `sinceRevision` is behind.
    const lateTab = new AbortController();
    const lateEvents = createEventCollector();
    await service.subscribe(created.id, lateEvents.push, lateTab.signal, { sinceRevision: 1 });
    expect(await lateEvents.next()).toEqual({ type: "updated", revision: 3 });

    // Deleting notifies open subscribers immediately.
    const deleteNotice = lateEvents.next();
    await service.remove(created.id);
    expect(await deleteNotice).toEqual({ type: "deleted", sessionId: created.id });

    tabA.abort();
    tabB.abort();
    lateTab.abort();
    await bus.close();
  });

  it("runs server-side state MCP commands with 0 tabs open (set_region, sort_tracks, list_tracks, set_track_metadata)", async () => {
    const sessions = createMemorySessions();
    const bus = createMemorySessionBus();
    const service = createSessionService({ sessions, bus });
    const created = await service.create({ name: "Headless MCP", snapshot: defaultSnapshot() });

    const beforeRegion = (await service.load(created.id)).snapshot.browser.region;
    expect(
      await runServerStateCommand(service, created.id, "set_region", {
        region: { chromosome: "chr1", start: 10, end: 5 },
      }),
    ).toMatchObject({ ok: false, code: "INVALID_PARAMS" });
    expect(
      await runServerStateCommand(service, created.id, "set_region", {
        region: { chromosome: "not-a-chromosome", start: 1000, end: 2000 },
      }),
    ).toMatchObject({ ok: false, code: "UNKNOWN_CHROMOSOME" });
    expect((await service.load(created.id)).snapshot.browser.region).toEqual(beforeRegion);

    expect(
      await runServerStateCommand(service, created.id, "set_region", {
        region: { chromosome: "chr7", start: 100, end: 500 },
      }),
    ).toEqual({
      ok: true,
      value: { region: { chromosome: "chr7", start: 100, end: 500 }, clamped: false },
    });
    expect((await service.load(created.id)).snapshot.browser.region).toEqual({
      chromosome: "chr7",
      start: 100,
      end: 500,
    });

    // Listing initial tracks.
    expect(await runServerStateCommand(service, created.id, "list_tracks", {})).toEqual({
      ok: true,
      value: {
        tracks: [
          { id: "ruler", title: "Coordinates", type: "ruler", pinned: true, metadata: {} },
          { id: "genes", title: "GENCODE 50 basic", type: "gene", pinned: false, metadata: {} },
          { id: "ccres", title: "Human cCREs", type: "ccre-bigbed", pinned: false, metadata: {} },
        ],
      },
    });

    // Sorting validation and pinned-ruler preservation.
    expect(
      await runServerStateCommand(service, created.id, "sort_tracks", {
        by: [{ field: "subject" }],
      }),
    ).toEqual({
      ok: false,
      code: "UNKNOWN_SORT_FIELD",
      error: 'Unknown sort field "subject". Available fields: "title", "type"',
    });
    expect(
      await runServerStateCommand(service, created.id, "sort_tracks", {
        by: [{ field: "type" }, { field: "type", direction: "descending" }],
      }),
    ).toMatchObject({ ok: false, code: "INVALID_PARAMS" });

    expect(
      await runServerStateCommand(service, created.id, "sort_tracks", {
        by: [{ field: "title", direction: "descending" }],
      }),
    ).toEqual({
      ok: true,
      value: {
        tracks: [
          { id: "ruler", title: "Coordinates" },
          { id: "ccres", title: "Human cCREs" },
          { id: "genes", title: "GENCODE 50 basic" },
        ],
      },
    });
    expect((await service.load(created.id)).snapshot.tracks.map(({ base }) => base.title)).toEqual([
      "Coordinates",
      "Human cCREs",
      "GENCODE 50 basic",
    ]);

    // Tagging and sorting by numeric metadata field.
    expect(
      await runServerStateCommand(service, created.id, "set_track_metadata", {
        trackIds: ["ccres", "genes"],
        set: { Interesting: true, Status: "abnormal" },
      }),
    ).toEqual({
      ok: true,
      value: {
        tracks: [
          { id: "ccres", metadata: { Interesting: true, Status: "abnormal" } },
          { id: "genes", metadata: { Interesting: true, Status: "abnormal" } },
        ],
      },
    });
    // Fields a change doesn't name stay.
    expect(
      await runServerStateCommand(service, created.id, "set_track_metadata", {
        trackIds: ["ccres"],
        set: { Status: "normal", Replicate: 2 },
        remove: ["Never set"],
      }),
    ).toEqual({
      ok: true,
      value: {
        tracks: [{ id: "ccres", metadata: { Interesting: true, Status: "normal", Replicate: 2 } }],
      },
    });
    // A name objects inherit, such as toString, is an ordinary field name.
    expect(
      await runServerStateCommand(service, created.id, "set_track_metadata", {
        trackIds: ["ccres"],
        remove: ["Interesting", "toString"],
      }),
    ).toEqual({
      ok: true,
      value: { tracks: [{ id: "ccres", metadata: { Status: "normal", Replicate: 2 } }] },
    });
    await runServerStateCommand(service, created.id, "set_track_metadata", {
      trackIds: ["genes"],
      set: { Replicate: 10 },
    });

    expect(
      await runServerStateCommand(service, created.id, "sort_tracks", {
        by: [{ field: "meta:Donor" }],
      }),
    ).toEqual({
      ok: false,
      code: "UNKNOWN_SORT_FIELD",
      error:
        'Unknown sort field "meta:Donor". Available fields: "title", "type", "meta:Interesting", "meta:Replicate", "meta:Status"',
    });
    expect(
      await runServerStateCommand(service, created.id, "sort_tracks", {
        by: [{ field: "meta:Replicate", direction: "descending" }],
      }),
    ).toEqual({
      ok: true,
      value: {
        tracks: [
          { id: "ruler", title: "Coordinates" },
          { id: "genes", title: "GENCODE 50 basic" },
          { id: "ccres", title: "Human cCREs" },
        ],
      },
    });
    expect(
      (await service.load(created.id)).snapshot.tracks.map(({ base, metadata }) => [
        base.id,
        metadata,
      ]),
    ).toEqual([
      ["ruler", undefined],
      ["genes", { Interesting: true, Status: "abnormal", Replicate: 10 }],
      ["ccres", { Status: "normal", Replicate: 2 }],
    ]);
  });

  it("changes no track's metadata when a server state command names a missing track or invalid change", async () => {
    const sessions = createMemorySessions();
    const bus = createMemorySessionBus();
    const service = createSessionService({ sessions, bus });
    const created = await service.create({ name: "Atomic metadata", snapshot: defaultSnapshot() });

    const cases = [
      [
        { trackIds: ["genes", "missing"], set: { Interesting: true } },
        { code: "TRACK_NOT_FOUND", error: 'No loaded track has the ID "missing"' },
      ],
      [{ trackIds: ["genes"] }, { code: "INVALID_PARAMS", error: "Give fields to set or remove" }],
      [
        { trackIds: ["genes"], set: { Status: "abnormal" }, remove: ["Status"] },
        { code: "INVALID_PARAMS", error: 'Fields both set and removed: "Status"' },
      ],
      [{ trackIds: ["genes", "genes"], set: { Interesting: true } }, { code: "INVALID_PARAMS" }],
      [{ trackIds: ["genes"], set: { Cells: ["K562"] } }, { code: "INVALID_PARAMS" }],
      [{ trackIds: ["genes"], set: { title: "Mine" } }, { code: "INVALID_PARAMS" }],
      [
        // Each value is within its own limit; together they pass the track's.
        {
          trackIds: ["genes", "ccres"],
          set: Object.fromEntries(
            Array.from({ length: 10 }, (_, index) => [`Note ${index}`, "x".repeat(1000)]),
          ),
        },
        { code: "METADATA_TOO_LARGE" },
      ],
    ] as const;

    for (const [params, failure] of cases) {
      expect(
        await runServerStateCommand(service, created.id, "set_track_metadata", params),
      ).toMatchObject({ ok: false, ...failure });
    }
    const listed = await runServerStateCommand(service, created.id, "list_tracks", {});
    expect(listed).toEqual({
      ok: true,
      value: {
        tracks: [
          expect.objectContaining({ id: "ruler", metadata: {} }),
          expect.objectContaining({ id: "genes", metadata: {} }),
          expect.objectContaining({ id: "ccres", metadata: {} }),
        ],
      },
    });
  });

  it("stops a server state command that the caller cancels before it writes", async () => {
    const sessions = createMemorySessions();
    const bus = createMemorySessionBus();
    const service = createSessionService({ sessions, bus });
    const created = await service.create({ name: "Cancelled", snapshot: defaultSnapshot() });
    const before = await service.load(created.id);
    const cancel = new AbortController();
    const load = sessions.load.bind(sessions);
    // The caller goes away while the command reads the session.
    sessions.load = async (id) => {
      const saved = await load(id);
      cancel.abort();
      return saved;
    };

    expect(
      await runServerStateCommand(
        service,
        created.id,
        "set_region",
        { region: { chromosome: "chr7", start: 100, end: 500 } },
        cancel.signal,
      ),
    ).toEqual({ ok: false, code: "CANCELLED", error: "The command was cancelled" });
    expect(await load(created.id)).toEqual(before);
    expect(
      await runServerStateCommand(service, created.id, "list_tracks", {}, cancel.signal),
    ).toMatchObject({ ok: false, code: "CANCELLED" });
  });

  it("diffs region pans, ignores derived track heights and jsonb key order, and preserves unchanged track refs", () => {
    const stores = createStores("hg38")!;
    const beforeTracks = [...stores.useTrackStore.getState().tracks];
    const base = { name: "Test", snapshot: defaultSnapshot() };

    // Derived track height changes alone produce no sync patch and identical syncKey.
    stores.useTrackStore.getState().updateTrack("genes", { base: { height: 96 } });
    const localGeneTrack = stores.useTrackStore.getState().getTrack("genes")!;
    const heightOnlyDoc = { name: "Test", snapshot: snapshot(stores) };
    expect(diffSessionPatch(base, heightOnlyDoc)).toBeUndefined();
    expect(syncKey(heightOnlyDoc)).toBe(syncKey(base));

    // Region pans produce a browser.region sync patch and update syncKey.
    stores.useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 9_000, end: 12_000 });
    const pannedDoc = { name: "Test", snapshot: snapshot(stores) };
    expect(diffSessionPatch(base, pannedDoc)).toEqual({
      browser: { region: { chromosome: "chr1", start: 9_000, end: 12_000 } },
    });
    expect(syncKey(pannedDoc)).not.toBe(syncKey(base));

    // Applying a remote snapshot updates browser settings and region while keeping
    // local derived track height and unchanged track object references.
    const remote: SessionSnapshot = {
      ...defaultSnapshot(),
      browser: {
        ...defaultSnapshot().browser,
        fontSize: 18,
        region: { chromosome: "chr5", start: 2000, end: 4000 },
      },
    };
    applyRemoteSnapshot(stores, remote);
    expect(stores.useBrowserStore.getState().fontSize).toBe(18);
    expect(stores.useBrowserStore.getState().region).toEqual({
      chromosome: "chr5",
      start: 2000,
      end: 4000,
    });
    expect(stores.useTrackStore.getState().getTrack("ruler")).toBe(beforeTracks[0]);
    expect(stores.useTrackStore.getState().getTrack("genes")).toBe(localGeneTrack);
    expect(stores.useTrackStore.getState().getTrack("genes")!.base.height).toBe(96);
    expect(stores.useTrackStore.getState().getTrack("ccres")).toBe(beforeTracks[2]);

    // Reordered keys in config and metadata (as PostgreSQL jsonb returns) produce
    // identical syncKey/diff and preserve existing track object references.
    stores.useTrackStore
      .getState()
      .updateTrack("ccres", { metadata: { Assay: "ChIP", CellType: "K562" } });
    const taggedBefore = stores.useTrackStore.getState().getTrack("ccres")!;
    const taggedDoc = { name: "Test", snapshot: snapshot(stores) };
    const reorderedSnapshot: SessionSnapshot = {
      ...taggedDoc.snapshot,
      tracks: taggedDoc.snapshot.tracks.map((track) =>
        track.base.id === "ccres"
          ? {
              ...track,
              config: Object.fromEntries(Object.entries(track.config).reverse()),
              metadata: { CellType: "K562", Assay: "ChIP" },
            }
          : track,
      ),
    };
    const reorderedDoc = { name: "Test", snapshot: reorderedSnapshot };
    expect(syncKey(reorderedDoc)).toBe(syncKey(taggedDoc));
    expect(diffSessionPatch(taggedDoc, reorderedDoc)).toBeUndefined();
    applyRemoteSnapshot(stores, reorderedSnapshot);
    expect(stores.useTrackStore.getState().getTrack("ccres")).toBe(taggedBefore);
  });

  it("leaves every store unchanged when a remote snapshot's track fails validation", () => {
    const stores = createStores("hg38")!;
    const before = snapshot(stores);
    const highlight = {
      id: "h1",
      region: { chromosome: "chr1", start: 100, end: 200 },
      color: "#ff0000",
    };
    const remote: SessionSnapshot = {
      ...before,
      browser: { ...before.browser, fontSize: 18, highlights: [highlight] },
      regionGroups: [{ id: "g1", name: "Group", color: null, collapsed: false, regionIds: ["h1"] }],
      tracks: [...before.tracks, { ...before.tracks[1], type: "not-a-track-type" }],
    };
    expect(() => applyRemoteSnapshot(stores, remote)).toThrow(
      "No track module registered for type: not-a-track-type",
    );
    expect(snapshot(stores)).toEqual(before);
  });

  it("ignores a retried PATCH saveId after an intervening write from another tab", async () => {
    const sessions = createMemorySessions();
    const bus = createMemorySessionBus();
    const service = createSessionService({ sessions, bus });

    const created = await service.create({ name: "Retry ordering", snapshot: defaultSnapshot() });
    const clientA = crypto.randomUUID();
    const clientB = crypto.randomUUID();
    const saveA = crypto.randomUUID();
    const saveB = crypto.randomUUID();

    // 1) Tab A saves region A, but its HTTP response is lost.
    const regionA = { chromosome: "chr1", start: 1_000, end: 2_000 };
    const first = await service.patch(created.id, {
      clientId: clientA,
      saveId: saveA,
      patch: { browser: { region: regionA } },
    });
    expect(first.revision).toBe(2);

    // 2) Tab B then saves region B.
    const regionB = { chromosome: "chr2", start: 3_000, end: 4_000 };
    const second = await service.patch(created.id, {
      clientId: clientB,
      saveId: saveB,
      patch: { browser: { region: regionB } },
    });
    expect(second.revision).toBe(3);

    // Listen for any spurious broadcast during Tab A's retry.
    const events: SessionEvent[] = [];
    const listenerAbort = new AbortController();
    await bus.subscribe(created.id, (event) => events.push(event), listenerAbort.signal);

    // 3) Tab A retries its original PATCH with the same saveId.
    const retried = await service.patch(created.id, {
      clientId: clientA,
      saveId: saveA,
      patch: { browser: { region: regionA } },
    });

    expect(retried.revision).toBe(3);
    expect(retried.snapshot.browser.region).toEqual(regionB);
    const stored = await service.load(created.id);
    expect(stored.revision).toBe(3);
    expect(stored.snapshot.browser.region).toEqual(regionB);
    expect(events).toEqual([]);

    listenerAbort.abort();
    await bus.close();
  });

  it("returns a closed SSE stream cleanly when the request aborts before or during authorization", async () => {
    const baseSessions = createMemorySessions();
    let releaseAuth!: () => void;
    const sessions: Sessions = {
      ...baseSessions,
      async authorize(id) {
        await baseSessions.authorize(id);
        await new Promise<void>((resolve) => {
          releaseAuth = resolve;
        });
      },
    };
    const bus = createMemorySessionBus();
    const service = createSessionService({ sessions, bus });
    const created = await baseSessions.create({
      name: "Aborted stream",
      snapshot: defaultSnapshot(),
    });

    const abort = new AbortController();
    const opening = openSessionEventStream(
      new Request(`http://localhost/api/sessions/${created.id}/events?sinceRevision=1`, {
        signal: abort.signal,
      }),
      created.id,
      async () => service,
    );
    await Promise.resolve();
    await Promise.resolve();
    // Client disconnects while authorize() is still pending.
    abort.abort();
    releaseAuth();

    const response = await opening;
    expect(response.status).toBe(200);
    const reader = response.body!.getReader();
    expect(await reader.read()).toEqual({ done: true, value: undefined });
    reader.releaseLock();
    await bus.close();
  });

  it("keeps server assembly bounds and region normalization in parity with @weng-lab/genomebrowser", () => {
    expect(assemblyChromosomes.hg38).toEqual(hg38.chromosomes);
    for (const region of [
      { chromosome: "chr1", start: -10, end: 500 },
      { chromosome: "chr1", start: 100, end: 200 },
      { chromosome: "chr99", start: 0, end: 10 },
      { chromosome: "chr1", start: 200, end: 100 },
      { chromosome: "chr1", start: 100, end: 100 },
      { chromosome: "chrM", start: 20_000, end: 30_000 },
    ]) {
      expect(normalizeAssemblyRegion("hg38", region)).toEqual(normalizeRegion(region, hg38));
    }
    expect(
      normalizeAssemblyRegion("mm10", { chromosome: "chr1", start: 0, end: 10 }),
    ).toMatchObject({ ok: false, code: "UNSUPPORTED_ASSEMBLY" });
  });
});

describe.skipIf(!testRedisUrl)("RedisSessionBus cross-instance pub/sub", () => {
  const namespace = testNamespace();
  let connA: RedisConnection;
  let connB: RedisConnection;
  let busA: SessionBus;
  let busB: SessionBus;

  beforeAll(() => {
    connA = createRedisConnection({ url: testRedisUrl! });
    connB = createRedisConnection({ url: testRedisUrl! });
    busA = createRedisSessionBus({ connection: connA, namespace });
    busB = createRedisSessionBus({ connection: connB, namespace });
  });

  afterAll(async () => {
    await Promise.all([busA.close(), busB.close()]);
    await Promise.all([connA.close(), connB.close()]);
  });

  it("delivers lightweight pub/sub revision hints between two separate server instances", async () => {
    const sessions = createMemorySessions();
    const serviceA = createSessionService({ sessions, bus: busA });
    const serviceB = createSessionService({ sessions, bus: busB });

    const created = await serviceA.create({ name: "Cross-instance", snapshot: defaultSnapshot() });

    const controller = new AbortController();
    const eventsOnB = createEventCollector();
    await serviceB.subscribe(created.id, eventsOnB.push, controller.signal, { sinceRevision: 1 });
    const received = eventsOnB.next();

    // Instance A mutates; Instance B's subscriber receives the revision hint via Redis pub/sub.
    const sourceClientId = crypto.randomUUID();
    await serviceA.patch(created.id, {
      clientId: sourceClientId,
      saveId: crypto.randomUUID(),
      patch: { browser: { fontSize: 16 } },
    });

    expect(await received).toEqual({ type: "updated", revision: 2, sourceClientId });

    controller.abort();
  });
});
