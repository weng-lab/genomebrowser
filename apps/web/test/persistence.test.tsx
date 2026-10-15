// @vitest-environment jsdom

import { bigBedModule } from "@weng-lab/genomebrowser-tracks/bigbed";
import { act } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { sessionSnapshotSchema, type SessionSnapshot } from "@weng-lab/browser-server/protocol";
import {
  BrowserSessionProvider,
  useBrowserSession,
  type BrowserSession,
} from "../browser/BrowserSession";
import { BrowserServer, useDeleteSession } from "../browser/BrowserServer";
import { BrowserView } from "../app/(workspace)/browser/BrowserView";

// Only the network transports are replaced; the browser, stores and persistence remain real.
class Stream extends EventTarget {
  static opened: Stream[] = [];
  onerror: (() => void) | null = null;
  close = vi.fn<() => void>();
  constructor(readonly url: string) {
    super();
    Stream.opened.push(this);
  }
}
let session: BrowserSession;
let deleteSession: (id: string) => Promise<void>;
let probe: Probe;
let load: ReturnType<typeof deferred>;
const save = vi.fn<typeof fetch>();
const loads = vi.fn<typeof fetch>();
const post = vi.fn<typeof fetch>();
function Controls() {
  session = useBrowserSession();
  deleteSession = useDeleteSession();
  return null;
}
function Shell({ sessionId = "local" }: { sessionId?: string }) {
  return (
    <BrowserSessionProvider>
      <BrowserServer endpoint="/api" sessionId={sessionId}>
        <Controls />
        <BrowserView />
      </BrowserServer>
    </BrowserSessionProvider>
  );
}
function status() {
  return document.querySelector('[role="status"]')!.textContent;
}
function loaded(snapshot: SessionSnapshot | null) {
  load.resolve(
    snapshot ? Response.json(snapshot) : Response.json({ error: "Not found" }, { status: 404 }),
  );
}
function savedSnapshot(): SessionSnapshot {
  const browser = session.useBrowserStore.getState();
  return sessionSnapshotSchema.parse({
    version: 1,
    browser: {
      assembly: "hg38",
      region: { chromosome: "chr2", start: 1000, end: 2000 },
      basePairDetail: { maxVisibleBases: 250 },
      marginWidth: 130,
      trackWidth: 1000,
      fontSize: 15,
      titleSize: 17,
      highlights: [
        {
          id: "saved-highlight",
          region: { chromosome: "chr2", start: 1100, end: 1200 },
          color: "#123456",
        },
      ],
      selectionMode: "highlight",
      selectionHighlight: browser.selectionHighlight,
    },
    tracks: session.useTrackStore.getState().tracks.map(({ type, base, config, source }) => ({
      type,
      base: { ...base, title: "Restored coordinates" },
      config,
      source,
    })),
    pinnedTrackIds: ["ruler"],
  });
}
async function advance(ms: number) {
  await act(async () => vi.advanceTimersByTimeAsync(ms));
}
function body(index = 0) {
  return JSON.parse(save.mock.calls[index][1]!.body as string);
}
function deferred() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(async () => {
  vi.useFakeTimers();
  Stream.opened = [];
  load = deferred();
  post.mockReset().mockResolvedValue(Response.json({ ok: true }));
  save.mockReset().mockResolvedValue(new Response("{}"));
  loads.mockReset().mockImplementation(() => load.promise);
  vi.stubGlobal("EventSource", Stream);
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
    init?.method === "PUT"
      ? save(url, init)
      : init?.method === "POST"
        ? post(url, init)
        : loads(url, init),
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1000);
  probe = await renderWithProbe(<Shell />);
});
afterEach(() => {
  probe?.unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("waits for a successful delayed restoration before accepting commands and keeps the stream through saves", async () => {
  expect(Stream.opened).toHaveLength(0);
  await act(async () => load.resolve(new Response("{}", { status: 503 })));
  expect(Stream.opened).toHaveLength(0);
  load = deferred();
  await advance(2000);
  expect(Stream.opened).toHaveLength(0);
  await act(async () => loaded(savedSnapshot()));
  expect(Stream.opened).toHaveLength(1);
  const stream = Stream.opened[0];
  expect(stream.url).toBe("/api/sessions/local/rpc");
  expect(document.querySelector('[aria-label="Visible region"]')!.textContent).toBe(
    "chr2:1,001-2,000",
  );
  const region = { chromosome: "chr3", start: 2000, end: 3000 };
  await act(async () =>
    stream.dispatchEvent(
      new MessageEvent("command", {
        data: JSON.stringify({
          commandId: "e376d6ef-36c9-4d01-ad52-9847bad99f3c",
          name: "set_region",
          expiresAt: Date.now() + 5000,
          params: { region },
        }),
      }),
    ),
  );
  expect(document.querySelector('[aria-label="Visible region"]')!.textContent).toBe(
    "chr3:2,001-3,000",
  );
  expect(JSON.parse(post.mock.calls[0][1]!.body as string).result.state.browser.region).toEqual(
    region,
  );
  save.mockResolvedValueOnce(new Response("{}", { status: 503 }));
  await advance(200);
  expect(status()).toBe("Not saved. Retrying…");
  await advance(2000);
  expect(status()).toBe("Saved");
  expect(body().browser.region).toEqual(region);
  expect(Stream.opened).toHaveLength(1);
  expect(stream.close).not.toHaveBeenCalled();
});

it("waits for restoration again when switching sessions, including returning to an earlier session", async () => {
  await act(async () => loaded(savedSnapshot()));
  const original = Stream.opened[0];
  load = deferred();
  await act(async () => probe.rerender(<Shell sessionId="other" />));
  expect(original.close).toHaveBeenCalled();
  expect(Stream.opened).toHaveLength(1);
  load = deferred();
  await act(async () => probe.rerender(<Shell />));
  expect(Stream.opened).toHaveLength(1);
  await act(async () => loaded(savedSnapshot()));
  expect(Stream.opened).toHaveLength(2);
  expect(Stream.opened[1].url).toBe("/api/sessions/local/rpc");
});

it("restores browser settings, highlights and tracks before editing, then persists serializable settings", async () => {
  expect(document.querySelector('[aria-label="Visible region"]')).toBeNull();
  const snapshot = savedSnapshot();
  await act(async () => loaded(snapshot));
  expect(document.querySelector('[aria-label="Visible region"]')!.textContent).toBe(
    "chr2:1,001-2,000",
  );
  expect(session.useBrowserStore.getState()).toMatchObject({
    ...snapshot.browser,
    assembly: { id: "hg38" },
  });
  expect(session.useTrackStore.getState()).toMatchObject({
    tracks: snapshot.tracks,
    pinnedTrackIds: ["ruler"],
  });
  expect(status()).toBe("Saved");
  await advance(200);
  expect(save).not.toHaveBeenCalled();
  act(() => {
    session.useBrowserStore.getState().setBasePairDetail({ maxVisibleBases: 500 });
    session.useBrowserStore.getState().setRegion({ chromosome: "chr3", start: 2000, end: 3000 });
    session.useTrackStore
      .getState()
      .updateTrack("ruler", { base: { title: "Edited coordinates", color: "#abcdef" } });
  });
  expect(status()).toBe("Saving");
  await advance(200);
  expect(save).toHaveBeenCalledTimes(1);
  expect(loads.mock.calls[0][0]).toBe("/api/sessions/local");
  expect(save.mock.calls[0][0]).toBe("/api/sessions/local");
  expect(save.mock.calls[0][1]).toMatchObject({
    method: "PUT",
    headers: { "Content-Type": "application/json" },
  });
  const persisted = sessionSnapshotSchema.parse(body());
  expect(persisted.browser).toMatchObject({
    region: { chromosome: "chr3", start: 2000, end: 3000 },
    basePairDetail: { maxVisibleBases: 500 },
    highlights: snapshot.browser.highlights,
  });
  expect(persisted.tracks[0].base).toMatchObject({ title: "Edited coordinates", color: "#abcdef" });
  expect(body().browser).not.toHaveProperty("isLoading");
  expect(body()).not.toHaveProperty("registry");
  expect(body().tracks[0]).not.toHaveProperty("module");
  expect(status()).toBe("Saved");
});

it("continues saving after clearing an optional track setting", async () => {
  await act(async () => loaded(savedSnapshot()));
  act(() => {
    expect(
      session.useTrackStore.getState().updateTrack("ruler", {
        config: { sequenceUrl: "https://example.test/reference.2bit" },
      }).ok,
    ).toBe(true);
  });
  await advance(200);
  expect(body().tracks[0].config.sequenceUrl).toBe("https://example.test/reference.2bit");
  expect(status()).toBe("Saved");
  const region = { chromosome: "chr6", start: 3000, end: 4000 };
  act(() => {
    expect(
      session.useTrackStore.getState().updateTrack("ruler", {
        config: { sequenceUrl: undefined },
      }).ok,
    ).toBe(true);
    session.useBrowserStore.getState().setRegion(region);
  });
  await advance(200);
  expect(save).toHaveBeenCalledTimes(2);
  const persisted = sessionSnapshotSchema.parse(body(1));
  expect(persisted.tracks[0].config).not.toHaveProperty("sequenceUrl");
  expect(persisted.browser.region).toEqual(region);
  expect(status()).toBe("Saved");
});

it("serializes saves and keeps newer edits unsaved until their own acknowledgement", async () => {
  await act(async () => loaded(savedSnapshot()));
  const first = deferred();
  const second = deferred();
  save.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  act(() =>
    session.useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 100, end: 200 }),
  );
  await advance(200);
  act(() =>
    session.useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 300, end: 400 }),
  );
  await advance(200);
  expect(save).toHaveBeenCalledTimes(1);
  await act(async () => first.resolve(new Response("{}")));
  expect(status()).toBe("Saving");
  await advance(0);
  expect(save).toHaveBeenCalledTimes(2);
  expect(body(0).browser.region.start).toBe(100);
  expect(body(1).browser.region.start).toBe(300);
  await act(async () => second.resolve(new Response("{}")));
  expect(status()).toBe("Saved");
  await advance(2000);
  expect(save).toHaveBeenCalledTimes(2);
});

it("retries failed saves", async () => {
  await act(async () => loaded(savedSnapshot()));
  save.mockResolvedValueOnce(new Response("{}", { status: 503 }));
  act(() =>
    session.useBrowserStore.getState().setRegion({ chromosome: "chr4", start: 500, end: 600 }),
  );
  await advance(200);
  expect(status()).toBe("Not saved. Retrying…");
  await advance(1999);
  expect(save).toHaveBeenCalledTimes(1);
  await advance(1);
  expect(save).toHaveBeenCalledTimes(2);
  expect(body(1)).toEqual(body(0));
  expect(status()).toBe("Saved");
});

it("starts from defaults without a saved session and retries a failed load", async () => {
  await act(async () => load.resolve(new Response("{}", { status: 503 })));
  expect(status()).toBe("Could not load session. Retrying…");
  expect(document.querySelector('[aria-label="Visible region"]')).toBeNull();
  load = deferred();
  await advance(2000);
  await act(async () => loaded(null));
  expect(document.querySelector('[aria-label="Visible region"]')!.textContent).toBe(
    "chr12:53,372,923-53,423,700",
  );
  // Defaults are unsaved until the first write.
  expect(status()).toBe("Saving");
  await advance(200);
  expect(body().browser.region.chromosome).toBe("chr12");
  expect(status()).toBe("Saved");
});

// A save acknowledgement changes status only; browser configuration and data are unchanged.
// Necessary: SaveStatus renders once because its selected save state changes.
// BrowserView and BrowserContent have no new data and must not render.
// BrowserContent encloses GenomeBrowser, whose distributed component name is minified.
it("limits save acknowledgement renders to the save indicator", async () => {
  await act(async () => loaded(savedSnapshot()));
  const pending = deferred();
  save.mockReturnValueOnce(pending.promise);
  act(() =>
    session.useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 100, end: 200 }),
  );
  await advance(200);
  const report = await probe.measure(() => pending.resolve(new Response("{}")));
  expect(report.why("SaveStatus")).toEqual([
    expect.objectContaining({ renders: 1, because: ["state"] }),
  ]);
  expect(report.pick("SaveStatus", "BrowserView", "BrowserContent")).toMatchInlineSnapshot(`
    {
      "BrowserContent": 0,
      "BrowserView": 0,
      "SaveStatus": 1,
    }
  `);
  expect(status()).toBe("Saved");
});

it("keeps retrying restoration without autosaving after deletion fails on an unsupported saved track", async () => {
  const saved = savedSnapshot();
  saved.tracks[0].type = "unregistered-track";
  expect(sessionSnapshotSchema.safeParse(saved).success).toBe(true);
  const remove = vi.fn(async () => Response.json({ error: "Unavailable" }, { status: 503 }));
  loads.mockImplementation(async () => Response.json(saved));
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
    init?.method === "DELETE"
      ? remove()
      : init?.method === "PUT"
        ? save(url, init)
        : init?.method === "POST"
          ? post(url, init)
          : loads(url, init),
  );
  await act(async () => probe.rerender(<Shell sessionId="unsupported" />));
  expect(status()).toBe("Could not load session. Retrying…");
  const reads = loads.mock.calls.length;
  await act(async () => {
    await expect(deleteSession("unsupported")).rejects.toThrow("Session deletion failed");
  });
  expect(remove).toHaveBeenCalledTimes(1);
  expect(loads).toHaveBeenCalledTimes(reads + 1);
  expect(status()).toBe("Could not load session. Retrying…");
  expect(document.querySelector('[aria-label="Visible region"]')).toBeNull();
  act(() =>
    session.useBrowserStore.getState().setRegion({
      chromosome: "chr1",
      start: 100,
      end: 200,
    }),
  );
  await advance(200);
  expect(save).not.toHaveBeenCalled();
  await advance(1800);
  expect(loads).toHaveBeenCalledTimes(reads + 2);
  expect(status()).toBe("Could not load session. Retrying…");
  expect(save).not.toHaveBeenCalled();
  expect(Stream.opened).toHaveLength(0);
});

it("keeps one pending load after failed deletion so a delayed response cannot discard edits", async () => {
  const first = deferred();
  const second = deferred();
  loads.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const remove = vi.fn(async () => Response.json({}, { status: 503 }));
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
    init?.method === "DELETE"
      ? remove()
      : init?.method === "PUT"
        ? save(url, init)
        : init?.method === "POST"
          ? post(url, init)
          : loads(url, init),
  );
  await act(async () => probe.rerender(<Shell sessionId="pending" />));
  const reads = loads.mock.calls.length;
  const saved = savedSnapshot();
  await act(async () => {
    await expect(deleteSession("pending")).rejects.toThrow("Session deletion failed");
  });
  await act(async () => first.resolve(Response.json(saved)));
  expect(status()).toBe("Saved");
  const edited = { chromosome: "chr7", start: 100, end: 200 };
  act(() => session.useBrowserStore.getState().setRegion(edited));
  await act(async () => second.resolve(Response.json(saved)));
  expect(session.useBrowserStore.getState().region).toEqual(edited);
  expect(loads).toHaveBeenCalledTimes(reads);
  await advance(200);
  expect(save).toHaveBeenCalledTimes(1);
  expect(body().browser.region).toEqual(edited);
});

it("reloads after a read finishes during a deletion that later fails", async () => {
  const first = deferred();
  const recovery = deferred();
  const removal = deferred();
  loads.mockReturnValueOnce(first.promise).mockReturnValueOnce(recovery.promise);
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
    init?.method === "DELETE"
      ? removal.promise
      : init?.method === "PUT"
        ? save(url, init)
        : init?.method === "POST"
          ? post(url, init)
          : loads(url, init),
  );
  await act(async () => probe.rerender(<Shell sessionId="pending" />));
  const reads = loads.mock.calls.length;
  const saved = savedSnapshot();
  let failed!: Promise<void>;
  await act(async () => {
    failed = deleteSession("pending").catch(() => {});
  });
  await act(async () => first.resolve(Response.json(saved)));
  expect(document.querySelector('[aria-label="Visible region"]')).toBeNull();
  await act(async () => {
    removal.resolve(Response.json({}, { status: 503 }));
    await failed;
  });
  expect(loads).toHaveBeenCalledTimes(reads + 1);
  await act(async () => recovery.resolve(Response.json(saved)));
  expect(status()).toBe("Saved");
  expect(session.useBrowserStore.getState().region).toEqual(saved.browser.region);
  await advance(2000);
  expect(loads).toHaveBeenCalledTimes(reads + 1);
  expect(save).not.toHaveBeenCalled();
});

it("restores saved user BigBed tracks after the temporary add-track control is removed", async () => {
  const saved = savedSnapshot();
  const track = bigBedModule.create({
    base: { id: "saved-bigbed", title: "Saved user track" },
    config: { url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed" },
    source: "user",
  });
  saved.tracks.push({
    type: track.type,
    base: track.base,
    config: track.config,
    source: track.source,
  });
  await act(async () => loaded(saved));
  expect(status()).toBe("Saved");
  expect(session.useTrackStore.getState().tracks.at(-1)).toMatchObject(saved.tracks.at(-1)!);
  await advance(2000);
  expect(save).not.toHaveBeenCalled();
  expect(Stream.opened).toHaveLength(1);
});
