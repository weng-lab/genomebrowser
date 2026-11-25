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

it("keeps panning tab-local, syncs persisted edits via revision hints without snap-back, follows server set_region, and propagates deletion", async () => {
  const initial = snapshot(createStores("hg38")!);
  const id = server.add("Shared session", initial);
  const clientA = openClient();
  const clientB = openClient();

  await clientA.state().open(id);
  await clientB.state().open(id);
  await vi.waitFor(() => expect(LiveEventSource.streams.size).toBe(2));

  // 1) Local panning in Client B stays local: no PATCH sent, server region unchanged.
  clientB
    .stores()
    .useBrowserStore.getState()
    .setRegion({ chromosome: "chr1", start: 40_000, end: 50_000 });
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 300);
  });
  const patches = () => server.requests.filter(({ method }) => method === "PATCH");
  expect(patches()).toHaveLength(0);
  expect(server.stored.get(id)!.snapshot.browser.region).toEqual(initial.browser.region);

  // 2) Client A changes a persisted setting -> Client B fetches via revision hint without
  //    echoing a PATCH back AND keeps its own local viewport without snapping back.
  const beforeTrackRef = clientB.stores().useTrackStore.getState().tracks[0];
  clientA.stores().useBrowserStore.getState().setSelectionMode("highlight");

  await vi.waitFor(() =>
    expect(clientB.stores().useBrowserStore.getState().selectionMode).toBe("highlight"),
  );
  expect(clientB.stores().useBrowserStore.getState().region).toEqual({
    chromosome: "chr1",
    start: 40_000,
    end: 50_000,
  });
  expect(clientB.stores().useTrackStore.getState().tracks[0]).toBe(beforeTrackRef);
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 300);
  });
  expect(patches()).toHaveLength(1);

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
