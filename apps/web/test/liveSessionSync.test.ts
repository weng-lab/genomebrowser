import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRedisConnection, type RedisConnection } from "../composition/server/redis";
import { createStores } from "../features/assemblies/assemblies";
import { runServerStateCommand } from "../features/agent/server/stateCommands";
import {
  createMemorySessionBus,
  createRedisSessionBus,
  type SessionBus,
} from "../features/sessions/server/bus";
import { createSessionService } from "../features/sessions/server/service";
import { SessionError, type Sessions } from "../features/sessions/server/sessions";
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

/** Pure in-memory `Sessions` repository for testing `SessionService` via DI without Postgres. */
function createMemorySessions(): Sessions & { loadCount: number } {
  const rows = new Map<string, SavedSession & { saveId: string | null }>();
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

  return {
    get loadCount() {
      return loadCount;
    },
    async create(input: SessionInput) {
      const id = crypto.randomUUID();
      const now = new Date();
      const parsed = sessionSnapshotSchema.parse(input.snapshot);
      const row: SavedSession & { saveId: string | null } = {
        id,
        name: input.name,
        createdAt: now,
        updatedAt: now,
        revision: 1,
        assembly: parsed.browser.assembly,
        trackCount: parsed.tracks.length,
        snapshot: parsed,
        saveId: null,
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
      const { saveId: _saveId, ...saved } = row;
      return saved;
    },
    async loadWithSaveId(id) {
      const row = rows.get(id);
      if (!row) throw new SessionError("NOT_FOUND", "Session not found");
      return { ...row };
    },
    async update(id, input: SessionUpdate) {
      const row = rows.get(id);
      if (!row) throw new SessionError("NOT_FOUND", "Session not found");
      if (row.saveId === input.saveId && row.revision === input.revision + 1) return meta(row);
      if (row.revision !== input.revision) throw new SessionError("CONFLICT", "Conflict");
      const parsed = sessionSnapshotSchema.parse(input.snapshot);
      const next: SavedSession & { saveId: string | null } = {
        ...row,
        name: input.name,
        snapshot: parsed,
        revision: row.revision + 1,
        trackCount: parsed.tracks.length,
        updatedAt: new Date(),
        saveId: input.saveId,
      };
      rows.set(id, next);
      return meta(next);
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

async function readEvent(
  stream: ReadableStream<Uint8Array>,
): Promise<{ event: string; data: SessionEvent }> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) throw new Error("SSE stream closed before event arrived");
      buffer += decoder.decode(value);
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, idx).split("\n");
        buffer = buffer.slice(idx + 2);
        const event = frame.find((line) => line.startsWith("event: "))?.slice(7);
        const data = frame.find((line) => line.startsWith("data: "))?.slice(6);
        if (event && data) return { event, data: JSON.parse(data) as SessionEvent };
      }
    }
  } finally {
    reader.releaseLock();
  }
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
    const streamA = await service.subscribe(created.id, tabA.signal, { sinceRevision: 1 });
    const streamB = await service.subscribe(created.id, tabB.signal, { sinceRevision: 1 });

    const clientA = crypto.randomUUID();
    const clientB = crypto.randomUUID();
    const nextA = readEvent(streamA);
    const nextB = readEvent(streamB);

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

    // Both streams receive lightweight revision hints (no snapshot payload).
    const [evtA, evtB] = await Promise.all([nextA, nextB]);
    expect(evtA.event).toBe("updated");
    expect(evtA.data).toMatchObject({ type: "updated", revision: expect.any(Number) });
    expect("session" in evtA.data).toBe(false);
    expect(evtB.event).toBe("updated");

    // Catch-up SSE sends a revision hint when `sinceRevision` is behind.
    const lateTab = new AbortController();
    const lateStream = await service.subscribe(created.id, lateTab.signal, { sinceRevision: 1 });
    const catchup = await readEvent(lateStream);
    expect(catchup).toEqual({
      event: "updated",
      data: { type: "updated", revision: 3 },
    });

    // Deleting notifies open streams immediately.
    const deleteNotice = readEvent(lateStream);
    await service.remove(created.id);
    const deleted = await deleteNotice;
    expect(deleted).toEqual({
      event: "deleted",
      data: { type: "deleted", sessionId: created.id },
    });

    tabA.abort();
    tabB.abort();
    lateTab.abort();
    await bus.close();
  });

  it("runs server-side state MCP commands with 0 tabs open (list, set_region, metadata, sort)", async () => {
    const sessions = createMemorySessions();
    const bus = createMemorySessionBus();
    const service = createSessionService({ sessions, bus });
    const created = await service.create({ name: "Headless MCP", snapshot: defaultSnapshot() });

    const listed = await runServerStateCommand(service, created.id, "list_tracks", {});
    expect(listed).toMatchObject({
      ok: true,
      value: {
        tracks: [
          expect.objectContaining({ id: "ruler" }),
          expect.objectContaining({ id: "genes" }),
          expect.objectContaining({ id: "ccres" }),
        ],
      },
    });

    const moved = await runServerStateCommand(service, created.id, "set_region", {
      region: { chromosome: "chr7", start: 100, end: 500 },
    });
    expect(moved).toEqual({
      ok: true,
      value: { region: { chromosome: "chr7", start: 100, end: 500 }, clamped: false },
    });

    const tagged = await runServerStateCommand(service, created.id, "set_track_metadata", {
      trackIds: ["ccres"],
      set: { Priority: 1 },
    });
    expect(tagged.ok).toBe(true);

    const taggedGenes = await runServerStateCommand(service, created.id, "set_track_metadata", {
      trackIds: ["genes"],
      set: { Priority: 2 },
    });
    expect(taggedGenes.ok).toBe(true);

    const sorted = await runServerStateCommand(service, created.id, "sort_tracks", {
      by: [{ field: "meta:Priority", direction: "ascending" }],
    });
    expect(sorted).toEqual({
      ok: true,
      value: {
        tracks: [
          { id: "ruler", title: "Coordinates" },
          { id: "ccres", title: "Human cCREs" },
          { id: "genes", title: "GENCODE 50 basic" },
        ],
      },
    });
  });

  it("diffs region pans, ignores derived track heights, and applies remote snapshots while preserving unchanged track refs", () => {
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
    const streamOnB = await serviceB.subscribe(created.id, controller.signal, { sinceRevision: 1 });
    const received = readEvent(streamOnB);

    // Instance A mutates; Instance B's SSE stream receives the revision hint via Redis pub/sub.
    const sourceClientId = crypto.randomUUID();
    await serviceA.patch(created.id, {
      clientId: sourceClientId,
      saveId: crypto.randomUUID(),
      patch: { browser: { fontSize: 16 } },
    });

    const evt = await received;
    expect(evt).toEqual({
      event: "updated",
      data: { type: "updated", revision: 2, sourceClientId },
    });

    controller.abort();
  });
});
