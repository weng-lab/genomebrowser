// @vitest-environment jsdom

import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createStores } from "../features/assemblies/assemblies";
import { createSession } from "../features/sessions/session";
import { snapshot } from "../features/sessions/storeSnapshot";
import type { SessionEvent } from "../features/sessions/syncSchema";
import { createSessionTransport } from "../features/sessions/transport";
import { installSessionServer, type SessionServer } from "./sessionServer";

/**
 * In-memory EventSource broker wired to `installSessionServer` so two real
 * `createSession` web clients sync live via lightweight revision hints + GET.
 */
class LiveEventSource extends EventTarget {
  static streams = new Set<LiveEventSource>();
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readonly sessionId: string;

  constructor(url: string) {
    super();
    const parsed = new URL(url, "http://localhost");
    this.sessionId = parsed.pathname.split("/")[3]!;
    LiveEventSource.streams.add(this);
    queueMicrotask(() => this.onopen?.());
  }

  close() {
    LiveEventSource.streams.delete(this);
  }

  static broadcast(sessionId: string, event: SessionEvent) {
    for (const stream of LiveEventSource.streams) {
      if (stream.sessionId !== sessionId) continue;
      stream.dispatchEvent(new MessageEvent(event.type, { data: JSON.stringify(event) }));
    }
  }
}

let server: SessionServer;
const cleanups: (() => void)[] = [];

function openClient() {
  const session = createSession({
    transport: createSessionTransport(),
    createStores,
    navigation: { show() {} },
  });
  cleanups.push(session.start());
  return {
    state: () => session.store.getState(),
    stores: () => session.store.getState().active!.stores,
  };
}

beforeEach(() => {
  LiveEventSource.streams.clear();
  vi.stubGlobal("EventSource", LiveEventSource);
  server = installSessionServer();

  // Wrap fetch so every successful PATCH or DELETE broadcasts a lightweight hint.
  const baseFetch = globalThis.fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const response = await baseFetch(input, init);
      const method = init?.method ?? "GET";
      const url = new URL(input, "http://localhost");
      const id = url.pathname.split("/")[3];
      if (response.ok && id && method === "PATCH") {
        const raw = typeof init?.body === "string" ? init.body : "{}";
        const body = JSON.parse(raw) as { clientId?: string };
        const session = (await response.clone().json()) as { revision: number };
        LiveEventSource.broadcast(id, {
          type: "updated",
          revision: session.revision,
          sourceClientId: body.clientId,
        });
      } else if (response.ok && id && method === "DELETE") {
        LiveEventSource.broadcast(id, { type: "deleted", sessionId: id });
      }
      return response;
    }),
  );
});

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!();
  LiveEventSource.streams.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("syncs panning and browser edits across tabs via revision hints without echo, follows server set_region, and propagates deletion", async () => {
  const initial = snapshot(createStores("hg38")!);
  const id = server.add("Shared session", initial);
  const clientA = openClient();
  const clientB = openClient();

  await clientA.state().open(id);
  await clientB.state().open(id);
  await vi.waitFor(() => expect(LiveEventSource.streams.size).toBe(2));

  const patches = () => server.requests.filter(({ method }) => method === "PATCH");

  // 1) Panning in Client B persists via PATCH and syncs live to Client A without echoing back.
  const beforeTrackRefA = clientA.stores().useTrackStore.getState().tracks[0];
  clientB
    .stores()
    .useBrowserStore.getState()
    .setRegion({ chromosome: "chr1", start: 40_000, end: 50_000 });
  await vi.waitFor(() =>
    expect(clientA.stores().useBrowserStore.getState().region).toEqual({
      chromosome: "chr1",
      start: 40_000,
      end: 50_000,
    }),
  );
  expect(server.stored.get(id)!.snapshot.browser.region).toEqual({
    chromosome: "chr1",
    start: 40_000,
    end: 50_000,
  });
  expect(clientA.stores().useTrackStore.getState().tracks[0]).toBe(beforeTrackRefA);
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 300);
  });
  expect(patches()).toHaveLength(1);

  // 2) Client A changes another setting -> Client B fetches via revision hint without
  //    echoing a PATCH back and keeps the synced viewport and unchanged track refs.
  const beforeTrackRefB = clientB.stores().useTrackStore.getState().tracks[0];
  clientA.stores().useBrowserStore.getState().setSelectionMode("highlight");

  await vi.waitFor(() =>
    expect(clientB.stores().useBrowserStore.getState().selectionMode).toBe("highlight"),
  );
  expect(clientB.stores().useBrowserStore.getState().region).toEqual({
    chromosome: "chr1",
    start: 40_000,
    end: 50_000,
  });
  expect(clientB.stores().useTrackStore.getState().tracks[0]).toBe(beforeTrackRefB);
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 300);
  });
  expect(patches()).toHaveLength(2);

  // 3) Explicit server-side region update (e.g. MCP set_region) moves both tabs.
  const stored = server.stored.get(id)!;
  stored.revision += 1;
  stored.snapshot = {
    ...stored.snapshot,
    browser: {
      ...stored.snapshot.browser,
      region: { chromosome: "chr7", start: 1_000, end: 2_000 },
    },
  };
  LiveEventSource.broadcast(id, { type: "updated", revision: stored.revision });
  await vi.waitFor(() => {
    expect(clientA.stores().useBrowserStore.getState().region).toEqual({
      chromosome: "chr7",
      start: 1_000,
      end: 2_000,
    });
    expect(clientB.stores().useBrowserStore.getState().region).toEqual({
      chromosome: "chr7",
      start: 1_000,
      end: 2_000,
    });
  });

  // 4) Concurrent edits to different sections (selectionMode in A, rename in B) merge cleanly.
  clientA.stores().useBrowserStore.getState().setSelectionMode("zoom");
  clientB.state().rename("Renamed in B");

  await vi.waitFor(() => {
    expect(clientA.state().active?.name).toBe("Renamed in B");
    expect(clientB.stores().useBrowserStore.getState().selectionMode).toBe("zoom");
  });
  expect(clientA.state().saveStatus).toBe("saved");
  expect(clientB.state().saveStatus).toBe("saved");

  // 5) Deleting in Client B immediately notifies Client A and ends saving.
  await clientB.state().remove(id);
  await vi.waitFor(() => expect(clientA.state().saveStatus).toBe("failed"));
  expect(clientA.state().error).toBe(
    "This session was deleted elsewhere. Its changes cannot be saved.",
  );
  expect(clientA.state().active?.signal.aborted).toBe(true);
});

it("keeps a conflicted tab frozen against remote updates until overwrite, while still handling deletion", async () => {
  const initial = snapshot(createStores("hg38")!);
  const id = server.add("Conflict session", initial);
  const clientA = openClient();
  const clientB = openClient();

  await clientA.state().open(id);
  await clientB.state().open(id);
  await vi.waitFor(() => expect(LiveEventSource.streams.size).toBe(2));

  // Force Client A into conflict on its next PATCH.
  server
    .hold("PATCH")
    .respond(Response.json({ code: "CONFLICT", message: "Conflict" }, { status: 409 }));
  clientA.stores().useBrowserStore.setState({ fontSize: 14 });
  await vi.waitFor(() => expect(clientA.state().saveStatus).toBe("conflict"));

  // While Client A is in conflict, Client B edits another field and broadcasts an SSE hint.
  clientB.stores().useBrowserStore.getState().setSelectionMode("highlight");
  await vi.waitFor(() =>
    expect(server.stored.get(id)!.snapshot.browser.selectionMode).toBe("highlight"),
  );
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 100);
  });

  // Client A must remain frozen in conflict with its own store state until the user chooses overwrite.
  expect(clientA.state().saveStatus).toBe("conflict");
  expect(clientA.stores().useBrowserStore.getState().selectionMode).toBe("pan");
  expect(clientA.stores().useBrowserStore.getState().fontSize).toBe(14);

  // Overwriting resolves the conflict and persists Client A's local edits.
  await clientA.state().overwrite();
  await vi.waitFor(() => expect(clientA.state().saveStatus).toBe("saved"));
  expect(server.stored.get(id)!.snapshot.browser.fontSize).toBe(14);
  expect(clientA.state().error).toBeUndefined();

  // If the session is deleted elsewhere while Client A is in conflict, it transitions to failed.
  server
    .hold("PATCH")
    .respond(Response.json({ code: "CONFLICT", message: "Conflict" }, { status: 409 }));
  clientA.stores().useBrowserStore.setState({ fontSize: 18 });
  await vi.waitFor(() => expect(clientA.state().saveStatus).toBe("conflict"));

  await clientB.state().remove(id);
  await vi.waitFor(() => expect(clientA.state().saveStatus).toBe("failed"));
  expect(clientA.state().active?.signal.aborted).toBe(true);
});

it("preserves unsaveable local edits across remote updates and reconciles once they become valid", async () => {
  const initial = snapshot(createStores("hg38")!);
  const id = server.add("Unsaveable session", initial);
  const clientA = openClient();
  const clientB = openClient();

  await clientA.state().open(id);
  await clientB.state().open(id);
  await vi.waitFor(() => expect(LiveEventSource.streams.size).toBe(2));

  // Put Client A's local store into an unserializable state (NaN serializes to null, failing schema).
  clientA.stores().useBrowserStore.setState({ fontSize: Number.NaN });
  await vi.waitFor(() => expect(clientA.state().saveStatus).toBe("failed"));

  // Client B renames the session, broadcasting an SSE update hint.
  clientB.state().rename("Renamed in B");
  await vi.waitFor(() => expect(server.stored.get(id)!.name).toBe("Renamed in B"));
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 100);
  });

  // Client A must keep its refused state and unserializable local store untouched.
  expect(clientA.state().saveStatus).toBe("failed");
  expect(Number.isNaN(clientA.stores().useBrowserStore.getState().fontSize)).toBe(true);

  // Fixing the local store reconciles Client B's rename while saving Client A's valid edit.
  clientA.stores().useBrowserStore.setState({ fontSize: 19 });
  await vi.waitFor(() => expect(clientA.state().saveStatus).toBe("saved"));
  expect(clientA.state().active?.name).toBe("Renamed in B");
  expect(clientA.stores().useBrowserStore.getState().fontSize).toBe(19);
  expect(server.stored.get(id)!.name).toBe("Renamed in B");
  expect(server.stored.get(id)!.snapshot.browser.fontSize).toBe(19);
});

it("detects a deletion missed while offline when SSE reconnect fails and stops retrying", async () => {
  const initial = snapshot(createStores("hg38")!);
  const id = server.add("Offline delete", initial);
  const clientA = openClient();

  await clientA.state().open(id);
  await vi.waitFor(() => expect(LiveEventSource.streams.size).toBe(1));
  const [stream] = [...LiveEventSource.streams];

  // Delete the session on the server without broadcasting an SSE deleted event (missed while offline).
  server.stored.delete(id);
  stream.onerror?.();

  await vi.waitFor(() => expect(clientA.state().saveStatus).toBe("failed"));
  expect(clientA.state().error).toBe(
    "This session was deleted elsewhere. Its changes cannot be saved.",
  );
  expect(clientA.state().active?.signal.aborted).toBe(true);
  expect(LiveEventSource.streams.size).toBe(0);
});

it("does not undo a newer tab's region edit when another tab retries a lost-response PATCH", async () => {
  const initial = snapshot(createStores("hg38")!);
  const id = server.add("Lost response retry", initial);
  const clientA = openClient();
  const clientB = openClient();

  await clientA.state().open(id);
  await clientB.state().open(id);
  await vi.waitFor(() => expect(LiveEventSource.streams.size).toBe(2));

  // Tab A saves regionA, which commits on the server, but Tab A's response is lost.
  const regionA = { chromosome: "chr1", start: 10_000, end: 20_000 };
  const regionB = { chromosome: "chr2", start: 30_000, end: 40_000 };
  server.lose("PATCH");
  clientA.stores().useBrowserStore.getState().setRegion(regionA);
  await vi.waitFor(() => expect(clientA.state().saveStatus).toBe("retrying"));
  expect(server.stored.get(id)!.snapshot.browser.region).toEqual(regionA);

  // Tab B then moves to regionB and saves before Tab A retries.
  clientB.stores().useBrowserStore.getState().setRegion(regionB);
  await vi.waitFor(() => expect(server.stored.get(id)!.snapshot.browser.region).toEqual(regionB));

  // When Tab A's retry lands with the original saveId, server recognizes it and preserves regionB.
  await vi.waitFor(() => expect(clientA.state().saveStatus).toBe("saved"), { timeout: 3000 });
  expect(server.stored.get(id)!.snapshot.browser.region).toEqual(regionB);
  expect(clientA.stores().useBrowserStore.getState().region).toEqual(regionB);
  expect(clientB.stores().useBrowserStore.getState().region).toEqual(regionB);
});

it("deterministically converges when one tab holds an unsaved draft while another tab renames later", async () => {
  const initial = snapshot(createStores("hg38")!);
  const id = server.add("Original name", initial);
  const clientA = openClient();
  const clientB = openClient();

  await clientA.state().open(id);
  await clientB.state().open(id);
  await vi.waitFor(() => expect(LiveEventSource.streams.size).toBe(2));

  const patchCount = () => server.requests.filter(({ method }) => method === "PATCH").length;

  // 1) Tab A sends a PATCH for fontSize that is held in flight, then edits selectionMode locally.
  const firstPatchA = server.hold("PATCH");
  clientA.stores().useBrowserStore.setState({ fontSize: 17 });
  await vi.waitFor(() => expect(patchCount()).toBe(1));
  clientA.stores().useBrowserStore.getState().setSelectionMode("highlight");

  // 2) While Tab A's draft is unsaved, Tab B renames the session and commits first.
  clientB.state().rename("Renamed in B");
  await vi.waitFor(() => expect(server.stored.get(id)!.name).toBe("Renamed in B"));

  // 3) Releasing Tab A's held PATCH merges Tab B's rename and then flushes Tab A's unsaved draft.
  firstPatchA.release();
  await vi.waitFor(() => {
    expect(clientA.state().saveStatus).toBe("saved");
    expect(clientB.state().saveStatus).toBe("saved");
    expect(clientA.state().active?.name).toBe("Renamed in B");
    expect(clientB.stores().useBrowserStore.getState().fontSize).toBe(17);
    expect(clientB.stores().useBrowserStore.getState().selectionMode).toBe("highlight");
  });
  expect(server.stored.get(id)!.name).toBe("Renamed in B");
  expect(server.stored.get(id)!.snapshot.browser.fontSize).toBe(17);
  expect(server.stored.get(id)!.snapshot.browser.selectionMode).toBe("highlight");

  // 4) Competing rename: Tab A holds an unsaved local rename draft while Tab B commits another rename.
  const patchesBeforeSecond = patchCount();
  const secondPatchA = server.hold("PATCH");
  clientA.stores().useBrowserStore.setState({ fontSize: 18 });
  await vi.waitFor(() => expect(patchCount()).toBe(patchesBeforeSecond + 1));
  clientA.state().rename("Draft rename A");

  clientB.state().rename("Earlier rename B");
  await vi.waitFor(() => expect(server.stored.get(id)!.name).toBe("Earlier rename B"));

  secondPatchA.release();
  await vi.waitFor(() => {
    expect(clientA.state().saveStatus).toBe("saved");
    expect(clientB.state().saveStatus).toBe("saved");
    expect(clientA.state().active?.name).toBe("Draft rename A");
    expect(clientB.state().active?.name).toBe("Draft rename A");
  });
  expect(server.stored.get(id)!.name).toBe("Draft rename A");
  expect(server.stored.get(id)!.snapshot.browser.fontSize).toBe(18);
});

it("keeps another tab's newer same-field edit when its own committed PATCH replies late", async () => {
  const id = server.add("Shared session", snapshot(createStores("hg38")!));
  const clientA = openClient();
  const clientB = openClient();
  await clientA.state().open(id);
  await clientB.state().open(id);
  await vi.waitFor(() => expect(LiveEventSource.streams.size).toBe(2));
  const patches = () => server.requests.filter(({ method }) => method === "PATCH");
  const stored = () => server.stored.get(id)!;
  const x = { chromosome: "chr2", start: 10_000, end: 20_000 };
  const y = { chromosome: "chr3", start: 30_000, end: 40_000 };

  // Tab A's write of X commits at revision 2, but its reply is delayed.
  const reply = server.delayReply("PATCH");
  clientA.stores().useBrowserStore.getState().setRegion(x);
  await vi.waitFor(() => expect(stored().revision).toBe(2));
  expect(stored().snapshot.browser.region).toEqual(x);

  // Tab B then commits Y at revision 3, and its hint reaches Tab A first.
  clientB.stores().useBrowserStore.getState().setRegion(y);
  await vi.waitFor(() => expect(stored().revision).toBe(3));
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 300);
  });
  // An edit Tab A makes while its write is outstanding is not covered by that write.
  clientA.stores().useBrowserStore.getState().setSelectionMode("highlight");

  reply.release();
  await vi.waitFor(() => expect(clientA.stores().useBrowserStore.getState().region).toEqual(y));
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 500);
  });
  // Only the later edit is written again; X is not resent over Y.
  expect(patches()).toHaveLength(3);
  expect(stored().snapshot.browser.region).toEqual(y);
  expect(stored().snapshot.browser.selectionMode).toBe("highlight");
  expect(clientA.stores().useBrowserStore.getState().region).toEqual(y);
  expect(clientA.state().saveStatus).toBe("saved");
});
