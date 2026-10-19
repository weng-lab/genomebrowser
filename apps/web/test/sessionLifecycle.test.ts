// @vitest-environment jsdom

import type { SessionSnapshot } from "../sessions/snapshot.ts";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createStores } from "../assemblies/assemblies";
import { snapshot } from "../browser/snapshot";
import { maxSessionBytes } from "../sessions/schema";
import { createSession } from "../sessions/session";
import { createSessionTransport } from "../sessions/transport";
import { installSessionServer, type SessionServer } from "./sessionServer";

// The session owner, its Effect autosave, the HTTP transport, and the stores are real.
// Only `fetch` is replaced, by the in-memory session routes, and timers are fake.
let server: SessionServer;
let session: ReturnType<typeof createSession>;
let stop: () => void;
let shown: (string | undefined)[];

function start() {
  shown = [];
  session = createSession({
    transport: createSessionTransport(),
    createStores,
    navigation: { show: (id) => shown.push(id) },
  });
  stop = session.start();
}
const state = () => session.store.getState();
const stores = () => state().active!.stores;
const setRegion = (start: number) =>
  stores()
    .useBrowserStore.getState()
    .setRegion({ chromosome: "chr1", start, end: start + 1000 });
const writes = () => server.writes().map(({ method }) => method);
const puts = () => server.requests.filter(({ method }) => method === "PUT");
const savedRegion = (id: string) => server.stored.get(id)?.snapshot.browser.region.start;
/** Let fibers, requests, and timers run for `ms` of fake time. */
async function advance(ms: number) {
  for (let elapsed = 0; elapsed <= ms; elapsed += 50) {
    await new Promise((resolve) => setImmediate(resolve));
    await vi.advanceTimersByTimeAsync(50);
  }
}
/** Whether closing the tab now asks for confirmation. */
function closeTab() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}
function defaults() {
  return snapshot(createStores("hg38")!);
}
/** A saved hg38 session that differs from the defaults in every saved setting. */
function savedSnapshot(): SessionSnapshot {
  const { browser, tracks } = defaults();
  return {
    version: 1,
    browser: {
      ...browser,
      region: { chromosome: "chr2", start: 1000, end: 2000 },
      basePairDetail: { maxVisibleBases: 250 },
      fontSize: 15,
      highlights: [
        {
          id: "promoter",
          region: { chromosome: "chr2", start: 1100, end: 1200 },
          color: "#123456",
        },
        { id: "enhancer", region: { start: 1500, end: 1600 }, color: "#abcdef", opacity: 0.4 },
      ],
      selectionMode: "highlight",
    },
    tracks: [...tracks]
      .reverse()
      .map((track) => ({ ...track, base: { ...track.base, title: `Saved ${track.base.title}` } })),
    // Pinned tracks lead the display order.
    pinnedTrackIds: ["ccres"],
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  server = installSessionServer();
  start();
});

afterEach(() => {
  stop();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("restores every saved setting before saving, then saves whole snapshots of later edits", async () => {
  const id = server.add("Promoter scan", savedSnapshot());
  await state().open(id);

  expect(state().active).toMatchObject({ id, name: "Promoter scan" });
  expect(snapshot(stores())).toEqual(savedSnapshot());
  expect(shown).toEqual([id]);
  await advance(1000);
  expect(writes()).toEqual([]);
  expect(state().saveStatus).toBe("saved");

  setRegion(5000);
  stores().useBrowserStore.getState().removeHighlight("enhancer");
  stores().useTrackStore.getState().setPinnedTrackIds([]);
  stores().useTrackStore.getState().reorderTracks(["ruler", "genes", "ccres"]);
  state().rename("Enhancer scan");
  expect(state().saveStatus).toBe("saving");
  await vi.waitFor(() => expect(state().saveStatus).toBe("saved"));

  // One write carries the whole snapshot and name.
  expect(puts()).toHaveLength(1);
  expect(server.stored.get(id)).toMatchObject({
    name: "Enhancer scan",
    snapshot: snapshot(stores()),
  });
  expect(server.stored.get(id)!.snapshot).toMatchObject({
    browser: { region: { start: 5000 }, highlights: [{ id: "promoter" }] },
    tracks: [{ base: { id: "ruler" } }, { base: { id: "genes" } }, { base: { id: "ccres" } }],
    pinnedTrackIds: [],
  });
  expect(state().sessions.map(({ name }) => name)).toEqual(["Enhancer scan"]);
});

it("writes one snapshot at a time, and an older acknowledgement leaves newer edits unsaved", async () => {
  const id = server.add("Session", defaults());
  await state().open(id);
  const first = server.hold("PUT");
  setRegion(1000);
  await vi.waitFor(() => expect(puts()).toHaveLength(1));
  setRegion(2000);
  await advance(1000);
  expect(puts()).toHaveLength(1);

  first.release();
  await vi.waitFor(() => expect(savedRegion(id)).toBe(1000));
  expect(state().saveStatus).toBe("saving");
  await vi.waitFor(() => expect(state().saveStatus).toBe("saved"));
  expect(puts()).toHaveLength(2);
  expect(savedRegion(id)).toBe(2000);
});

it("continues saving after clearing an optional track setting", async () => {
  const id = server.add("Session", defaults());
  await state().open(id);
  const sequenceUrl = "https://example.test/reference.2bit";
  stores().useTrackStore.getState().updateTrack("ruler", { config: { sequenceUrl } });
  await vi.waitFor(() => expect(state().saveStatus).toBe("saved"));
  expect(server.stored.get(id)!.snapshot.tracks[0].config).toMatchObject({ sequenceUrl });

  stores()
    .useTrackStore.getState()
    .updateTrack("ruler", { config: { sequenceUrl: undefined } });
  setRegion(3000);
  await vi.waitFor(() => expect(state().saveStatus).toBe("saved"));
  expect(savedRegion(id)).toBe(3000);
  expect(server.stored.get(id)!.snapshot.tracks[0].config).not.toHaveProperty("sequenceUrl");
});

it("retries failed writes with backoff without blocking edits", async () => {
  const id = server.add("Session", defaults());
  await state().open(id);
  server.fail("PUT");
  server.fail("PUT");
  setRegion(1000);
  await vi.waitFor(() => expect(state().saveStatus).toBe("retrying"));
  setRegion(3000);
  await vi.waitFor(() => expect(state().saveStatus).toBe("saved"), { timeout: 5000 });
  expect(puts()).toHaveLength(3);
  expect(savedRegion(id)).toBe(3000);
});

it.each([
  ["keeps failing to load", 503, "Could not open the session. Try again."],
  ["is missing", 404, "This session was not found. It may have been deleted."],
])("never saves defaults over a session that %s", async (_, status, error) => {
  const id = server.add("Session", savedSnapshot());
  await advance(100);
  if (status === 503) for (let attempt = 0; attempt < 3; attempt++) server.fail("GET");
  const opening = state().open(status === 404 ? crypto.randomUUID() : id);
  await advance(3000);
  await opening;

  expect(state()).toMatchObject({ active: undefined, error, pending: undefined });
  expect(shown).toEqual([]);
  expect(writes()).toEqual([]);
  expect(server.stored.get(id)!.snapshot).toEqual(savedSnapshot());
});

it("refuses to open a session for an unsupported assembly without saving it", async () => {
  const id = server.add("Mouse", {
    ...defaults(),
    browser: { ...defaults().browser, assembly: "mm10" },
  });
  await state().open(id);
  expect(state()).toMatchObject({
    active: undefined,
    error: "This session's saved state cannot be restored.",
  });
  await advance(1000);
  expect(writes()).toEqual([]);
});

it("saves edits, including ones made while the next session loads, before switching", async () => {
  const a = server.add("A", defaults());
  const b = server.add("B", savedSnapshot());
  await state().open(a);
  setRegion(1000);
  const load = server.hold("GET");
  const switching = state().open(b);
  await advance(100);
  setRegion(7000);
  load.release();
  await switching;

  expect(state().error).toBeUndefined();
  expect(state().active!.id).toBe(b);
  expect(savedRegion(a)).toBe(7000);
  expect(shown).toEqual([a, b]);
});

it("keeps the active session and its edits when they cannot be saved before switching", async () => {
  const a = server.add("A", defaults());
  const b = server.add("B", defaults());
  await state().open(a);
  const write = server.hold("PUT");
  setRegion(1000);
  const switching = state().open(b);
  // Switching writes immediately rather than after the edit delay.
  await vi.waitFor(() => expect(puts()).toHaveLength(1));
  write.fail();
  await switching;

  expect(state().active!.id).toBe(a);
  expect(state().error).toBe("Could not save “A”. Its changes are kept here.");
  expect(stores().useBrowserStore.getState().region.start).toBe(1000);
  expect(shown.at(-1)).toBe(a);

  // Saving continues in the background; selecting B again then succeeds.
  await vi.waitFor(() => expect(state().saveStatus).toBe("saved"), { timeout: 5000 });
  await state().open(b);
  expect(state().active!.id).toBe(b);
  expect(savedRegion(a)).toBe(1000);
});

it("keeps the active session when the next one cannot be opened", async () => {
  const a = server.add("A", defaults());
  await state().open(a);
  await state().open(crypto.randomUUID());
  expect(state().active!.id).toBe(a);
  expect(state().error).toBe("This session was not found. It may have been deleted.");
  expect(shown).toEqual([a, a]);
});

it("opens only the newest requested session", async () => {
  const b = server.add("B", defaults());
  const c = server.add("C", defaults());
  await advance(100);
  const slow = server.hold("GET");
  const openingB = state().open(b);
  await advance(100);
  await state().open(c);
  slow.release();
  await openingB;
  await advance(500);
  expect(state().active!.id).toBe(c);
  expect(shown).toEqual([c]);
});

it("deletes the active session after its outstanding write and never writes it again", async () => {
  const id = server.add("Session", defaults());
  await state().open(id);
  const oldStores = stores();
  const write = server.hold("PUT");
  setRegion(1000);
  await vi.waitFor(() => expect(puts()).toHaveLength(1));
  const removing = state().remove(id);
  await advance(500);
  expect(writes()).toEqual(["PUT"]);

  write.release();
  await removing;
  expect(writes()).toEqual(["PUT", "DELETE"]);
  expect(server.stored.has(id)).toBe(false);
  expect(state()).toMatchObject({ active: undefined, saveStatus: undefined, sessions: [] });
  expect(shown.at(-1)).toBeUndefined();

  oldStores.useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 9000, end: 9500 });
  await advance(3000);
  expect(writes()).toEqual(["PUT", "DELETE"]);
});

it("resumes saving when deleting the active session fails", async () => {
  const id = server.add("Session", defaults());
  await state().open(id);
  const previous = state().active!;
  setRegion(3000);
  const deletion = server.hold("DELETE");
  const removing = state().remove(id);
  await vi.waitFor(() => expect(writes()).toContain("DELETE"));
  expect(previous.signal.aborted).toBe(true);
  expect(closeTab()).toBe(true);
  deletion.fail();
  await removing;
  expect(state().active!.id).toBe(id);
  expect(stores()).toBe(previous.stores);
  expect(stores().useBrowserStore.getState().region.start).toBe(3000);
  expect(state().active!.signal).not.toBe(previous.signal);
  expect(state().active!.signal.aborted).toBe(false);
  expect(state().error).toBe("Could not delete “Session”. Try again.");

  setRegion(4000);
  await vi.waitFor(() => expect(savedRegion(id)).toBe(4000));
  // Terminal save failure must also abort the renewed attachment.
  server.stored.delete(id);
  setRegion(5000);
  await vi.waitFor(() => expect(state().active!.signal.aborted).toBe(true));
});

it("keeps edits to a session deleted elsewhere unsaved until they are discarded", async () => {
  const id = server.add("Session", defaults());
  const other = server.add("Other", defaults());
  await state().open(id);
  server.stored.delete(id);
  const { signal } = state().active!;
  setRegion(1000);
  await vi.waitFor(() => expect(state().saveStatus).toBe("failed"));
  expect(state().error).toBe("This session was deleted elsewhere. Its changes cannot be saved.");
  expect(signal.aborted).toBe(true);
  setRegion(2000);
  await advance(5000);
  expect(writes()).toEqual(["PUT"]);
  expect(server.stored.has(id)).toBe(false);
  expect(closeTab()).toBe(true);

  // Opening another session would lose the edits, so this one stays open.
  await state().open(other);
  expect(state().active!.id).toBe(id);
  expect(state().error).toBe("Could not save “Session”. Its changes are kept here.");
  expect(stores().useBrowserStore.getState().region.start).toBe(2000);

  expect(await state().close({ discard: true })).toBe(true);
  expect(state()).toMatchObject({ active: undefined, saveStatus: undefined });
  expect(closeTab()).toBe(false);
  await state().open(other);
  expect(state().active!.id).toBe(other);
  expect(writes()).toEqual(["PUT"]);
});

it("aborts the active session's signal as it is replaced, removed, closed, or stopped", async () => {
  const a = server.add("A", defaults());
  const b = server.add("B", defaults());
  // Record whether each session's signal had aborted when it stopped being active.
  const abortedWhenReplaced: boolean[] = [];
  session.store.subscribe((next, previous) => {
    if (previous.active && next.active?.signal !== previous.active.signal)
      abortedWhenReplaced.push(previous.active.signal.aborted);
  });

  await state().open(a);
  const first = state().active!.signal;
  state().rename("Renamed");
  expect(state().active!.signal).toBe(first);
  await state().open(b);
  await state().remove(b);
  await state().open(a);
  await state().close();
  await state().open(a);
  stop();
  expect(abortedWhenReplaced).toEqual([true, true, true, true]);
  start();
});

it("refuses to resend edits too large to save, and saves once they are changed", async () => {
  const id = server.add("Session", defaults());
  const other = server.add("Other", defaults());
  await state().open(id);
  const title = (title: string) =>
    stores().useTrackStore.getState().updateTrack("ruler", { base: { title } });
  const savedTitle = () =>
    server.stored.get(id)!.snapshot.tracks.find(({ base }) => base.id === "ruler")!.base.title;
  title("x".repeat(maxSessionBytes));
  await vi.waitFor(() => expect(state().saveStatus).toBe("failed"));
  expect(state().error).toBe(
    "The latest changes are too large or invalid to save. Change them to keep saving.",
  );
  // A further edit can still save, so work on the stores may continue.
  expect(state().active!.signal.aborted).toBe(false);
  await advance(5000);
  expect(puts()).toHaveLength(1);
  expect(closeTab()).toBe(true);

  // Switching does not resend them, and keeps them here.
  await state().open(other);
  expect(state().active!.id).toBe(id);
  expect(puts()).toHaveLength(1);

  title("Short ruler");
  expect(state().saveStatus).toBe("saving");
  await vi.waitFor(() => expect(state().saveStatus).toBe("saved"));
  expect(savedTitle()).toBe("Short ruler");
  expect(state().error).toBeUndefined();
  expect(closeTab()).toBe(false);
  await state().open(other);
  expect(state().active!.id).toBe(other);
});

it("keeps a newer name through list refreshes and acknowledgements, sorted by name", async () => {
  const a = server.add("Alpha", defaults());
  server.add("Beta", defaults());
  await state().open(a);
  const names = () => state().sessions.map(({ name }) => name);
  window.dispatchEvent(new Event("focus"));
  await vi.waitFor(() => expect(names()).toEqual(["Alpha", "Beta"]));
  const write = server.hold("PUT");
  state().rename("Zeta");
  expect(names()).toEqual(["Beta", "Zeta"]);
  await vi.waitFor(() => expect(puts()).toHaveLength(1));

  // A refresh while the write is outstanding still reads the old name.
  window.dispatchEvent(new Event("focus"));
  await advance(100);
  expect(server.requests.at(-1)).toMatchObject({ method: "GET", id: undefined });
  expect(names()).toEqual(["Beta", "Zeta"]);

  // Renamed again before the first name is acknowledged.
  state().rename("Gamma");
  expect(names()).toEqual(["Beta", "Gamma"]);
  write.release();
  await vi.waitFor(() => expect(puts()).toHaveLength(2));
  expect(names()).toEqual(["Beta", "Gamma"]);
  await vi.waitFor(() => expect(state().saveStatus).toBe("saved"));
  const stored = server.stored.get(a)!;
  expect(stored.name).toBe("Gamma");
  expect(state().sessions.find((session) => session.id === a)).toEqual({
    id: a,
    name: "Gamma",
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
  });
});

it("saves and closes the active session before an account change, which nothing interrupts", async () => {
  const id = server.add("Session", defaults());
  const other = server.add("Other", defaults());
  await state().open(id);
  setRegion(1000);
  let finish!: () => void;
  const change = vi.fn<() => Promise<void>>(
    () => new Promise<void>((resolve) => (finish = resolve)),
  );
  const closing = state().close({ next: change });
  await vi.waitFor(() => expect(change).toHaveBeenCalledOnce());
  expect(savedRegion(id)).toBe(1000);
  expect(state()).toMatchObject({ active: undefined, saveStatus: undefined });
  expect(shown.at(-1)).toBeUndefined();

  // A session opened during the change waits for it.
  const opening = state().open(other);
  await advance(500);
  expect(state().active).toBeUndefined();
  finish();
  expect(await closing).toBe(true);
  await opening;
  expect(state().active!.id).toBe(other);
});

it("changes accounts only once unsaved edits are saved or discarded", async () => {
  const id = server.add("Session", defaults());
  await state().open(id);
  const change = vi.fn<() => void>();
  const write = server.hold("PUT");
  setRegion(1000);
  await vi.waitFor(() => expect(puts()).toHaveLength(1));
  const closing = state().close({ next: change });
  write.fail();
  expect(await closing).toBe(false);
  expect(change).not.toHaveBeenCalled();
  expect(state().active!.id).toBe(id);
  expect(state().error).toBe("Could not save “Session”. Its changes are kept here.");
  expect(stores().useBrowserStore.getState().region.start).toBe(1000);

  expect(await state().close({ discard: true, next: change })).toBe(true);
  expect(change).toHaveBeenCalledOnce();
  expect(state().active).toBeUndefined();
  await advance(5000);
  expect(puts()).toHaveLength(1);
});

it("creates a session with the assembly's defaults after saving the active one", async () => {
  const a = server.add("A", defaults());
  await state().open(a);
  setRegion(1000);
  await state().create({ name: "  New analysis ", assembly: "hg38" });

  const created = state().active!;
  expect(created.name).toBe("New analysis");
  expect(server.stored.get(created.id)).toMatchObject({
    owner: "user_alice",
    snapshot: defaults(),
  });
  expect(savedRegion(a)).toBe(1000);
  expect(state().sessions.map(({ name }) => name)).toEqual(["A", "New analysis"]);
  expect(shown.at(-1)).toBe(created.id);

  await state().create({ name: "Mouse", assembly: "mm10" });
  expect(state().error).toBe("The mm10 assembly is not supported.");
  expect(state().active!.id).toBe(created.id);
});

it("lists sessions, retrying while unavailable", async () => {
  stop();
  server.add("Saved", defaults());
  server.fail("GET");
  start();
  await vi.waitFor(() => expect(state().status).toBe("unavailable"));
  await advance(5000);
  expect(state().status).toBe("ready");
  expect(state().sessions.map(({ name }) => name)).toEqual(["Saved"]);
});

it("aborts a request still reading its response when stopped", async () => {
  let signal: AbortSignal | undefined;
  vi.stubGlobal("fetch", (_url: string, init: RequestInit) => {
    signal = init.signal!;
    // Like the platform fetch, aborting fails a body that is still arriving.
    const body = new ReadableStream({
      start(controller) {
        signal!.addEventListener("abort", () => controller.error(signal!.reason));
      },
    });
    return Promise.resolve(new Response(body, { status: 200 }));
  });
  const opening = state().open(crypto.randomUUID());
  await advance(100);
  expect(signal?.aborted).toBe(false);
  stop();
  await opening;
  expect(signal!.aborted).toBe(true);
  expect(state()).toMatchObject({ active: undefined, pending: undefined, status: "loading" });
  stop = () => {};
});

it("never carries one account's session or pending write into an account changed elsewhere", async () => {
  const alices = server.add("Alice's", defaults());
  server.add("Bob's", defaults(), "user_bob");
  await state().open(alices);
  const oldStores = stores();
  server.hold("PUT");
  setRegion(1000);
  await vi.waitFor(() => expect(puts()).toHaveLength(1));

  // A change made elsewhere replaces the owner; the outstanding write is aborted.
  stop();
  server.user = "user_bob";
  start();
  await vi.waitFor(() => expect(state().status).toBe("ready"));
  expect(state().sessions.map(({ name }) => name)).toEqual(["Bob's"]);
  expect(state().active).toBeUndefined();

  oldStores.useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 5000, end: 6000 });
  await advance(3000);
  expect(writes()).toEqual(["PUT"]);
  expect(savedRegion(alices)).toBe(defaults().browser.region.start);
});

it("asks before closing the tab only while edits are unsaved", async () => {
  const id = server.add("Session", defaults());
  await state().open(id);
  expect(closeTab()).toBe(false);
  setRegion(1000);
  expect(closeTab()).toBe(true);
  await vi.waitFor(() => expect(state().saveStatus).toBe("saved"));
  expect(closeTab()).toBe(false);
});
