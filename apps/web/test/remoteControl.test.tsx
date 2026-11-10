// @vitest-environment jsdom

// Import first: it mocks the Next.js router before the app's modules load.
import { clerk, route, stubLayout, WorkspaceApp } from "./workspaceApp";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, useLayoutEffect } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createStores } from "../features/assemblies/assemblies";
import { maxSessionTracks } from "../features/browser/urlTracks";
import { snapshot } from "../features/sessions/storeSnapshot";
import { useSession } from "../features/sessions/SessionProvider";
import { installSessionServer, type SessionServer } from "./sessionServer";

// EventSource and fetch are the external boundaries. The session owner, remote
// control attachment, command execution, stores, and UI are real.
class Stream extends EventTarget {
  static opened: Stream[] = [];
  static log: string[] = [];
  onerror: (() => void) | null = null;
  onopen: (() => void) | null = null;
  closed = false;
  /** The commands URL, without the tab query. */
  readonly url: string;
  /** The tab this connection belongs to. */
  readonly tab: string | null;
  constructor(url: string) {
    super();
    const parsed = new URL(url, "http://localhost");
    this.url = parsed.pathname;
    this.tab = parsed.searchParams.get("tab");
    Stream.opened.push(this);
    Stream.log.push(`open ${this.url}`);
  }
  close() {
    this.closed = true;
    Stream.log.push(`close ${this.url}`);
  }
  send(command: object) {
    this.dispatchEvent(new MessageEvent("command", { data: JSON.stringify(command) }));
  }
}

const commandId = "e376d6ef-36c9-4d01-ad52-9847bad99f3c";
let server: SessionServer;
let probe: Probe | undefined;
let alpha: string;
let beta: string;

const defaults = () => snapshot(createStores("hg38")!);
const text = () => document.body.textContent ?? "";
const heading = () => document.querySelector("h1")?.textContent;
const region = () =>
  document.querySelector('[aria-label^="Edit region"] .MuiTypography-body2')?.textContent;
const latest = () => Stream.opened.at(-1)!;
const reply = (call = 0) => JSON.parse(server.replies.mock.calls[call][1].body as string);
const setRegion = (chromosome: string, start: number, expiresAt = Date.now() + 5000) =>
  act(async () =>
    latest().send({
      commandId,
      name: "set_region",
      expiresAt,
      params: { region: { chromosome, start, end: start + 1000 } },
    }),
  );
function click(selector: string) {
  return act(async () => document.querySelector<HTMLElement>(selector)!.click());
}
const toggle = () => document.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
async function enableRemoteControl() {
  await click('nav a[aria-label="Settings"]');
  await vi.waitFor(() => expect(toggle().disabled).toBe(false));
  await click('input[type="checkbox"]');
  await vi.waitFor(() => expect(server.remoteControl.get("user_alice")).toBe(true));
}
/** Unmount the workspace and render Alpha again, as a reload does. */
async function reload() {
  probe!.unmount();
  route.reset(`/browser/${alpha}`);
  probe = await renderWithProbe(<WorkspaceApp />);
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));
}

beforeEach(async () => {
  Stream.opened = [];
  Stream.log = [];
  vi.stubGlobal("EventSource", Stream);
  server = installSessionServer();
  stubLayout();
  alpha = server.add("Alpha", defaults());
  beta = server.add("Beta", defaults());
  // Most cases turn remote control on in Settings, so the account starts with it off.
  server.remoteControl.set("user_alice", false);
  route.reset(`/browser/${alpha}`);
  probe = await renderWithProbe(<WorkspaceApp />);
  await vi.waitFor(() => {
    if (heading() !== "Alpha") throw new Error("Alpha is not open yet");
  });
});

afterEach(() => {
  probe?.unmount();
  probe = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("starts on for an account without a saved choice", async () => {
  server.remoteControl.clear();
  await reload();
  await vi.waitFor(() => expect(Stream.log).toEqual([`open /api/sessions/${alpha}/commands`]));
  await click('nav a[aria-label="Settings"]');
  expect(toggle().checked).toBe(true);
});

it("keeps the saved choice across reloads, and sessions save while it is off", async () => {
  expect(Stream.opened).toEqual([]);
  expect(text()).toContain("Remote control is off. Turn it on in Settings.");
  await click('button[aria-label="Pan right"]');
  await vi.waitFor(() => expect(server.writes().map(({ method }) => method)).toEqual(["PUT"]));

  await click('nav a[aria-label="Settings"]');
  await vi.waitFor(() => expect(toggle().disabled).toBe(false));
  const save = server.hold("settings PUT");
  await click('input[type="checkbox"]');
  expect(text()).toContain("Saving…");
  // It attaches only once the choice is saved.
  expect(Stream.opened).toEqual([]);
  await act(async () => save.release());
  await vi.waitFor(() => expect(Stream.log).toEqual([`open /api/sessions/${alpha}/commands`]));

  await reload();
  await vi.waitFor(() => expect(Stream.log.at(-1)).toBe(`open /api/sessions/${alpha}/commands`));
  expect(server.settingsRequests).toEqual(["GET", true, "GET"]);
});

it("detaches as soon as it is turned off, and attaches again if that cannot be saved", async () => {
  await enableRemoteControl();
  const stream = latest();
  const save = server.hold("settings PUT");
  await click('input[type="checkbox"]');
  expect(stream.closed).toBe(true);
  expect(toggle().checked).toBe(false);
  await act(async () => save.fail());
  await vi.waitFor(() => expect(text()).toContain("Remote control could not be saved. Try again."));
  expect(toggle().checked).toBe(true);
  expect(server.remoteControl.get("user_alice")).toBe(true);
  await vi.waitFor(() => expect(latest()).not.toBe(stream));
});

it("reports a preference that cannot be loaded and loads it on retry", async () => {
  server.remoteControl.clear();
  server.fail("settings GET");
  await reload();
  await click('nav a[aria-label="Settings"]');
  await vi.waitFor(() => expect(text()).toContain("Remote control settings could not be loaded."));
  expect(toggle().disabled).toBe(true);
  await click('[role="alert"] button');
  await vi.waitFor(() => expect(toggle().checked).toBe(true));
  expect(text()).not.toContain("could not be loaded");
  await vi.waitFor(() => expect(Stream.log).toEqual([`open /api/sessions/${alpha}/commands`]));
});

it.each([
  [401, "Sign in to use remote control."],
  [503, "Remote control settings could not be loaded."],
])(
  "detaches while a refresh fails with %i, and attaches again once one succeeds",
  async (status, message) => {
    await enableRemoteControl();
    const stream = latest();
    server.fail("settings GET", status);
    await act(async () => window.dispatchEvent(new Event("focus")));
    await vi.waitFor(() => expect(stream.closed).toBe(true));
    expect(text()).toContain(message);
    expect(toggle().disabled).toBe(true);
    expect(Stream.opened).toEqual([stream]);

    await act(async () => window.dispatchEvent(new Event("focus")));
    await vi.waitFor(() => expect(Stream.opened).toHaveLength(2));
    expect(toggle().disabled).toBe(false);
    expect(toggle().checked).toBe(true);
  },
);

it("follows a choice saved in another tab when the window regains focus", async () => {
  await enableRemoteControl();
  const stream = latest();
  server.remoteControl.set("user_alice", false);
  await act(async () => window.dispatchEvent(new Event("focus")));
  await vi.waitFor(() => expect(stream.closed).toBe(true));
  expect(toggle().checked).toBe(false);
});

it("attaches to the open session only once restored, and leaves it before attaching to the next", async () => {
  await enableRemoteControl();
  expect(Stream.log).toEqual([`open /api/sessions/${alpha}/commands`]);
  expect(text()).toContain("Connecting…");
  act(() => latest().onopen!());
  expect(text()).toContain("Connected");

  const load = server.hold("GET");
  await act(async () => route.push(`/browser/${beta}`));
  expect(Stream.log).toHaveLength(1);
  load.release();
  await vi.waitFor(() => expect(heading()).toBe("Beta"));
  expect(Stream.log).toEqual([
    `open /api/sessions/${alpha}/commands`,
    `close /api/sessions/${alpha}/commands`,
    `open /api/sessions/${beta}/commands`,
  ]);
  act(() => latest().onopen!());
  expect(text()).toContain(`Connected. MCP tools called with sessionId "${beta}" run in this tab.`);

  await click('nav a[aria-label="Settings"]');
  await click('input[type="checkbox"]');
  expect(latest().closed).toBe(true);
  expect(text()).toContain("Off");
});

it("applies a region command in the browser, replies with the region, and saves it", async () => {
  await enableRemoteControl();
  await act(async () => route.back());
  await setRegion("chr1", 1000);
  expect(region()).toBe("chr1:1,001-2,000");
  expect(server.replies.mock.calls[0][0]).toBe(`/api/sessions/${alpha}/commands`);
  expect(reply()).toEqual({
    commandId,
    result: {
      ok: true,
      value: { region: { chromosome: "chr1", start: 1000, end: 2000 }, clamped: false },
    },
  });
  await vi.waitFor(() =>
    expect(server.stored.get(alpha)!.snapshot.browser.region.start).toBe(1000),
  );
});

it("rejects unknown commands and invalid parameters without changing the region", async () => {
  await enableRemoteControl();
  await act(async () => route.back());
  const before = region();
  await act(async () =>
    latest().send({
      commandId,
      name: "delete_everything",
      expiresAt: Date.now() + 5000,
      params: {},
    }),
  );
  await act(async () =>
    latest().send({
      commandId,
      name: "set_region",
      expiresAt: Date.now() + 5000,
      params: { region: { chromosome: "chr1", start: 10, end: 5 } },
    }),
  );
  expect(reply(0).result).toMatchObject({ ok: false, code: "UNKNOWN_COMMAND" });
  expect(reply(1).result).toMatchObject({ ok: false, code: "INVALID_PARAMS" });
  expect(region()).toBe(before);
});

it("returns the store's rejection and ignores expired commands without changing the region", async () => {
  await enableRemoteControl();
  await act(async () => route.back());
  const before = region();
  await setRegion("not-a-chromosome", 1000);
  expect(reply().result).toMatchObject({ ok: false, code: "UNKNOWN_CHROMOSOME" });
  await setRegion("chr1", 1000, Date.now() - 1000);
  expect(server.replies).toHaveBeenCalledTimes(1);
  expect(region()).toBe(before);
});

it("sorts tracks for the agent, replies with the new order, and saves it", async () => {
  await enableRemoteControl();
  const sort = (by: unknown) =>
    act(async () =>
      latest().send({
        commandId,
        name: "sort_tracks",
        expiresAt: Date.now() + 5000,
        params: { by },
      }),
    );
  const savedTitles = () => server.stored.get(alpha)!.snapshot.tracks.map(({ base }) => base.title);
  const before = savedTitles();

  await sort(["subject"]);
  expect(reply(0).result).toEqual({
    ok: false,
    code: "UNKNOWN_SORT_FIELD",
    error: 'Unknown sort field "subject". Available fields: "title", "type"',
  });
  await sort(["type", "type"]);
  expect(reply(1).result).toMatchObject({ ok: false, code: "INVALID_PARAMS" });

  await sort(["type", "title"]);
  expect(reply(2).result).toEqual({
    ok: true,
    value: {
      tracks: [
        { id: "ccres", title: "Human cCREs" },
        { id: "genes", title: "GENCODE 50 basic" },
        { id: "ruler", title: "Coordinates" },
      ],
    },
  });
  expect(before).toEqual(["Coordinates", "GENCODE 50 basic", "Human cCREs"]);
  await vi.waitFor(() =>
    expect(savedTitles()).toEqual(["Human cCREs", "GENCODE 50 basic", "Coordinates"]),
  );
});

function fixture(path: string) {
  return new Uint8Array(
    readFileSync(join(import.meta.dirname, "../../../packages/reader/test/fixtures", path)),
  );
}
const files = {
  bigWig: fixture("bigwig/basic.bw"),
  bed6: fixture("bigbed/basic.bb"),
  bam: fixture("bam/bamExample.bam"),
  bai: fixture("bam/bamExample.bam.bai"),
};
const dataHost = "https://data.example.test";
const addTrackCommand = (params: object, expiresAt = Date.now() + 5000) => ({
  commandId: crypto.randomUUID(),
  name: "add_track_from_url",
  expiresAt,
  params,
});
const addTrack = (params: object, expiresAt?: number) =>
  act(async () => latest().send(addTrackCommand(params, expiresAt)));
const savedTracks = () => server.stored.get(alpha)!.snapshot.tracks;
const startingTitles = ["Coordinates", "GENCODE 50 basic", "Human cCREs"];

// Each row is a file URL an agent might add, and the track the session saves for it.
it.each([
  {
    file: "a BigWig URL",
    url: `${dataHost}/tracks/ENCFF001ABC.bigWig`,
    hosted: { [`${dataHost}/tracks/ENCFF001ABC.bigWig`]: files.bigWig },
    params: {},
    saved: { type: "bigwig", title: "ENCFF001ABC", config: {} },
  },
  {
    file: "a BigBed URL, reading the columns it declares",
    url: `${dataHost}/peaks.bb`,
    hosted: { [`${dataHost}/peaks.bb`]: files.bed6 },
    params: {},
    saved: { type: "bigbed", title: "peaks", config: { bedSchema: "bed6" } },
  },
  {
    file: "a BAM URL with a query string",
    url: `${dataHost}/reads.bam?download=1`,
    hosted: {
      [`${dataHost}/reads.bam?download=1`]: files.bam,
      [`${dataHost}/reads.bam.bai?download=1`]: files.bai,
    },
    params: {},
    saved: {
      type: "bam",
      title: "reads",
      config: { indexUrl: `${dataHost}/reads.bam.bai?download=1` },
    },
  },
  {
    file: "a URL without an extension, given a type",
    url: `${dataHost}/download?id=7`,
    hosted: { [`${dataHost}/download?id=7`]: files.bigWig },
    params: { type: "bigwig", title: "Signal" },
    saved: { type: "bigwig", title: "Signal", config: {} },
  },
])("adds a track for the agent from $file, and saves it", async (row) => {
  for (const [url, file] of Object.entries(row.hosted)) server.files.set(url, file);
  await enableRemoteControl();

  await addTrack({ url: row.url, ...row.params });

  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(1));
  const { result } = reply();
  expect(result).toEqual({
    ok: true,
    value: { id: expect.any(String), title: row.saved.title, type: row.saved.type },
  });
  await vi.waitFor(() => expect(savedTracks()).toHaveLength(startingTitles.length + 1));
  expect(savedTracks().at(-1)).toMatchObject({
    type: row.saved.type,
    base: { id: result.value.id, title: row.saved.title },
    source: "user",
    config: { url: row.url, ...row.saved.config },
  });
});

it("tells the agent why a URL cannot be added, and adds nothing for it", async () => {
  server.files.set(`${dataHost}/missing.bw`, 404);
  server.files.set(`${dataHost}/peaks.bb`, files.bed6);
  server.files.set(`${dataHost}/signal.bw`, files.bigWig);
  await enableRemoteControl();
  const attempts = [
    {
      params: { url: `${dataHost}/download?id=7` },
      code: "UNKNOWN_TYPE",
      error:
        "The track type cannot be inferred from the URL. Choose one of: bigwig, bigbed, gene, ccre-bigbed, bam.",
    },
    {
      params: { url: `${dataHost}/Registry-V4/GRCh38-cCREs.PLS.bed` },
      code: "UNSUPPORTED_FORMAT",
      error:
        "The URL names a plain-text BED file, which the browser cannot read. Convert it to BigBed with UCSC's bedToBigBed, then add the BigBed file's URL.",
    },
    {
      params: { url: `${dataHost}/coverage.bedGraph.gz` },
      code: "UNSUPPORTED_FORMAT",
      error:
        "The URL names a plain-text bedGraph file, which the browser cannot read. Convert it to BigWig with UCSC's bedGraphToBigWig, then add the BigWig file's URL.",
    },
    {
      params: { url: "signal.bw" },
      code: "INVALID_URL",
      error: "The URL is not an absolute HTTP or HTTPS URL.",
    },
    {
      params: { url: "ftp://data.example.test/notes.txt" },
      code: "INVALID_URL",
      error: "The URL is not an absolute HTTP or HTTPS URL.",
    },
    {
      params: { url: `${dataHost}/missing.bw` },
      code: "UNREACHABLE",
      error: "The BigWig file request returned HTTP 404.",
    },
    {
      params: { url: `${dataHost}/peaks.bb`, type: "bigwig" },
      code: "UNREADABLE",
      error: "The BigWig file could not be read: Expected a BigWig file",
    },
  ];

  for (const [index, { params, code, error }] of attempts.entries()) {
    await addTrack(params);
    await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(index + 1));
    expect(reply(index).result).toEqual({ ok: false, code, error });
  }

  // The session saves the whole track list, so a later add shows nothing else was added.
  await addTrack({ url: `${dataHost}/signal.bw` });
  await vi.waitFor(() =>
    expect(savedTracks().map(({ base }) => base.title)).toEqual([...startingTitles, "signal"]),
  );
});

it("adds nothing when checking a URL outlasts its command", async () => {
  server.files.set(`${dataHost}/slow.bw`, "silent");
  server.files.set(`${dataHost}/signal.bw`, files.bigWig);
  await enableRemoteControl();

  await addTrack({ url: `${dataHost}/slow.bw` }, Date.now() + 100);

  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(1));
  expect(reply().result).toEqual({
    ok: false,
    code: "CANCELLED",
    error: "Adding the track was cancelled.",
  });
  await addTrack({ url: `${dataHost}/signal.bw` });
  await vi.waitFor(() =>
    expect(savedTracks().map(({ base }) => base.title)).toEqual([...startingTitles, "signal"]),
  );
});

it("refuses tracks beyond the session's limit, including adds that finish checking together", async () => {
  server.files.set(`${dataHost}/first.bw`, files.bigWig);
  server.files.set(`${dataHost}/second.bw`, files.bigWig);
  const { tracks } = server.stored.get(alpha)!.snapshot;
  const [ruler] = tracks;
  const room = maxSessionTracks - tracks.length - 1;
  tracks.push(
    ...Array.from({ length: room }, (_, index) => ({
      ...ruler,
      base: { ...ruler.base, id: `ruler-${index}` },
    })),
  );
  await reload();
  await enableRemoteControl();
  const limit = {
    ok: false,
    code: "TRACK_LIMIT",
    error: `The session already has ${maxSessionTracks} tracks, the most it can hold. Remove a track before adding another.`,
  };

  // Both start while the session has room for one.
  await act(async () => {
    latest().send(addTrackCommand({ url: `${dataHost}/first.bw` }));
    latest().send(addTrackCommand({ url: `${dataHost}/second.bw` }));
  });
  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(2));
  expect([reply(0).result, reply(1).result]).toEqual(
    expect.arrayContaining([expect.objectContaining({ ok: true }), limit]),
  );
  // An unhosted URL would fail its check, so this shows a full session refuses before checking.
  await addTrack({ url: `${dataHost}/unhosted.bw` });
  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(3));
  expect(reply(2).result).toEqual(limit);
  await vi.waitFor(() => expect(savedTracks()).toHaveLength(maxSessionTracks));
});

it("keeps saving while the command stream is unavailable, then reconnects", async () => {
  await enableRemoteControl();
  await act(async () => route.back());
  const first = latest();
  act(() => first.onerror!());
  expect(first.closed).toBe(true);
  await click('button[aria-label="Pan right"]');
  await vi.waitFor(() => expect(server.writes()).toHaveLength(1));
  await vi.waitFor(() => expect(latest()).not.toBe(first), { timeout: 2000 });
  // A reconnect belongs to the same tab, so it replaces that tab's connection.
  expect(latest().tab).toBe(first.tab);
  act(() => latest().onopen!());
  await setRegion("chr2", 2000);
  expect(region()).toBe("chr2:2,001-3,000");
});

it("attaches as a new tab each time it attaches again", async () => {
  await enableRemoteControl();
  const first = latest();
  expect(first.tab).toMatch(/^[0-9a-f-]{36}$/);
  await act(async () => route.push(`/browser/${beta}`));
  await vi.waitFor(() => expect(latest().url).toBe(`/api/sessions/${beta}/commands`));
  expect(latest().tab).not.toBe(first.tab);
});

const exportImage = (params: object, expiresAt = Date.now() + 5000) =>
  act(async () => latest().send({ commandId, name: "export_image", expiresAt, params }));
const preview = () => document.querySelector('[aria-labelledby="agent-image-preview-title"]');

/** Object URLs and anchor clicks are the download boundary; jsdom has neither. */
function stubDownloads() {
  const saved: string[] = [];
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = () => "blob:export";
      static revokeObjectURL = vi.fn<(url: string) => void>();
    },
  );
  const click = HTMLAnchorElement.prototype.click;
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    function (this: HTMLAnchorElement) {
      if (this.download) saved.push(this.download);
      else click.call(this);
    },
  );
  return saved;
}

it("shows an exported image to the user and saves it only when they download it", async () => {
  const saved = stubDownloads();
  await enableRemoteControl();
  await act(async () => route.back());
  await exportImage({ format: "svg", filename: "Figure 1", includeTitles: false });
  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(1));
  const { result } = reply();
  expect(result).toMatchObject({ ok: true, value: { filename: "Figure 1.svg", format: "svg" } });
  expect(result.value.width).toBeGreaterThan(0);
  expect(preview()?.textContent).toContain("Figure 1.svg · SVG");
  expect(preview()?.querySelector("img")?.getAttribute("src")).toBe("blob:export");
  expect(saved).toEqual([]);

  await act(async () =>
    [...preview()!.querySelectorAll("button")]
      .find((button) => button.textContent === "Download SVG")!
      .click(),
  );
  expect(saved).toEqual(["Figure 1.svg"]);
  await vi.waitFor(() => expect(preview()).toBeNull());
});

it("reports an export failure to the agent without showing a preview", async () => {
  stubDownloads();
  await enableRemoteControl();
  // The Settings page is open, so no browser is rendered to capture.
  await exportImage({});
  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(1));
  expect(reply().result).toEqual({
    ok: false,
    code: "EXPORT_FAILED",
    error: "The genome browser is not currently rendered.",
  });
  expect(preview()).toBeNull();
});

it("cancels an export that outlasts its command, without showing a preview", async () => {
  // jsdom never loads the image that PNG encoding waits for.
  stubDownloads();
  await enableRemoteControl();
  await act(async () => route.back());
  await exportImage({ format: "png" }, Date.now() + 100);
  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(1));
  expect(reply().result).toMatchObject({ ok: false, code: "CANCELLED" });
  expect(preview()).toBeNull();
});

it("stops an export when its caller cancels it, without showing a preview", async () => {
  // jsdom never loads the image that PNG encoding waits for.
  stubDownloads();
  await enableRemoteControl();
  await act(async () => route.back());
  await exportImage({ format: "png" });
  expect(server.replies).not.toHaveBeenCalled();
  // A cancellation for another command changes nothing.
  await act(async () =>
    latest().dispatchEvent(
      new MessageEvent("cancel", { data: JSON.stringify({ commandId: crypto.randomUUID() }) }),
    ),
  );
  expect(server.replies).not.toHaveBeenCalled();
  await act(async () =>
    latest().dispatchEvent(new MessageEvent("cancel", { data: JSON.stringify({ commandId }) })),
  );
  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(1));
  expect(reply().result).toMatchObject({ ok: false, code: "CANCELLED" });
  expect(preview()).toBeNull();
});

/** A real pending HTTP reply: aborting the request rejects it. */
function holdReply() {
  let release!: (response: Response) => void;
  server.replies.mockImplementationOnce(
    (_url, { signal }) =>
      new Promise<Response>((resolve, reject) => {
        release = resolve;
        if (signal?.aborted) reject(signal.reason);
        else signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
      }),
  );
  return (status: number) => release(new Response(null, { status }));
}

it.each(["session replacement", "remote control disabled"])(
  "cancels a pending command reply on %s",
  async (reason) => {
    await enableRemoteControl();
    const finishReply = holdReply();
    await setRegion("chr1", 1000);
    const pending = server.replies.mock.calls[0][1].signal!;
    const first = latest();
    expect(pending.aborted).toBe(false);

    if (reason === "session replacement") {
      await act(async () => route.push(`/browser/${beta}`));
    } else {
      await click('input[type="checkbox"]');
    }
    await vi.waitFor(() => expect(pending.aborted).toBe(true));
    expect(first.closed).toBe(true);
    const streams = Stream.opened.length;
    await act(async () => finishReply(503));
    expect(Stream.opened).toHaveLength(streams);
    expect(server.replies).toHaveBeenCalledTimes(1);
  },
);

it("cancels a pending reconnect when remote control is disabled", async () => {
  await enableRemoteControl();
  const first = latest();
  vi.useFakeTimers();
  act(() => first.onerror!());
  expect(first.closed).toBe(true);
  await click('input[type="checkbox"]');
  await act(async () => vi.advanceTimersByTimeAsync(2000));
  expect(Stream.opened).toEqual([first]);
  expect(text()).toContain("Off");
});

it.each([409, 503, "network failure"] as const)(
  "does not replay edits after a command reply returns %s",
  async (status) => {
    await enableRemoteControl();
    await act(async () => route.back());
    let fail!: () => void;
    if (status === "network failure") {
      server.replies.mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            fail = () => reject(new Error("Offline"));
          }),
      );
    } else {
      const finishReply = holdReply();
      fail = () => finishReply(status);
    }
    await setRegion("chr1", 1000);
    await click('button[aria-label="Pan right"]');
    const edited = region();
    expect(edited).not.toBe("chr1:1,001-2,000");
    const first = latest();
    vi.useFakeTimers();
    await act(async () => fail());
    await act(async () => vi.advanceTimersByTimeAsync(1100));
    expect(Stream.opened).toHaveLength(status === 409 ? 1 : 2);
    expect(first.closed).toBe(status !== 409);
    expect(region()).toBe(edited);
    expect(server.replies).toHaveBeenCalledTimes(1);
  },
);

let closedOnOpen: boolean | undefined;

/** Sends a command to the open connection when `id` opens, before effects clean up. */
function CommandOnOpen({ id }: { id: string }) {
  const active = useSession((session) => session.active?.id);
  useLayoutEffect(() => {
    if (active !== id) return;
    closedOnOpen = latest().closed;
    latest().send({
      commandId,
      name: "set_region",
      expiresAt: Date.now() + 5000,
      params: { region: { chromosome: "chr4", start: 4000, end: 5000 } },
    });
  }, [active, id]);
  return null;
}

it("rejects a command for a session replaced before remote control detaches from it", async () => {
  probe!.unmount();
  route.reset(`/browser/${alpha}`);
  probe = await renderWithProbe(
    <WorkspaceApp>
      <CommandOnOpen id={beta} />
    </WorkspaceApp>,
  );
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));
  await enableRemoteControl();
  const stream = latest();
  await act(async () => route.push(`/browser/${beta}`));
  await vi.waitFor(() => expect(heading()).toBe("Beta"));

  expect(server.replies.mock.calls[0][0]).toBe(`/api/sessions/${alpha}/commands`);
  expect(reply().result).toMatchObject({ ok: false, code: "SESSION_CLOSED" });
  // Replacing the session closed its stream before React rendered Beta.
  expect(closedOnOpen).toBe(true);
  expect(Stream.opened.filter(({ url }) => url === stream.url)).toEqual([stream]);
  expect(server.stored.get(alpha)!.snapshot.browser.region).toEqual(defaults().browser.region);
  expect(region()).not.toContain("chr4");
});

it("keeps one connection and accepts commands while the browser page is unmounted", async () => {
  await enableRemoteControl();
  const stream = latest();
  await setRegion("chr3", 3000);
  expect(region()).toBeUndefined();
  await act(async () => route.back());
  expect(Stream.opened).toEqual([stream]);
  expect(region()).toBe("chr3:3,001-4,000");
  expect(reply().result.ok).toBe(true);
});

it("detaches when the account menu signs out, and old commands cannot run", async () => {
  await enableRemoteControl();
  await act(async () => route.back());
  const stream = latest();
  act(() => stream.onopen!());
  await click('button[aria-label="Account"]');
  await act(async () =>
    [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')]
      .find((item) => item.textContent === "Sign out")!
      .click(),
  );
  await vi.waitFor(() => expect(stream.closed).toBe(true));
  expect(clerk.signOut).toHaveBeenCalledOnce();
  await act(async () =>
    stream.send({
      commandId,
      name: "set_region",
      expiresAt: Date.now() + 5000,
      params: { region: { chromosome: "chr5", start: 5000, end: 6000 } },
    }),
  );
  expect(server.replies).not.toHaveBeenCalled();
  expect(Stream.opened.filter(({ url }) => url === `/api/sessions/${alpha}/commands`)).toEqual([
    stream,
  ]);
  expect(server.stored.get(alpha)!.snapshot.browser.region).toEqual(defaults().browser.region);
});

it("detaches when the account changes elsewhere and the workspace remounts", async () => {
  await enableRemoteControl();
  await act(async () => route.back());
  const stream = latest();
  server.user = "user_bob";
  act(() => clerk.signIn("user_bob"));
  expect(stream.closed).toBe(true);
  // Its stream is closed, so the server fails the command; a late event runs nothing.
  await setRegion("chr5", 5000);
  expect(server.replies).not.toHaveBeenCalled();
  expect(server.stored.get(alpha)!.snapshot.browser.region).toEqual(defaults().browser.region);
});

it("detaches once the session's edits can no longer be saved", async () => {
  await enableRemoteControl();
  await act(async () => route.back());
  const stream = latest();
  act(() => stream.onopen!());
  server.stored.delete(alpha);
  await click('button[aria-label="Pan right"]');
  await vi.waitFor(() => expect(stream.closed).toBe(true));
  expect(text()).toContain(
    "This session's changes can no longer be saved, so agents cannot control it.",
  );
  await setRegion("chr6", 6000);
  expect(reply().result).toMatchObject({ ok: false, code: "SESSION_CLOSED" });
  expect(region()).not.toContain("chr6");
  expect(Stream.opened).toEqual([stream]);
});

it.each([false, true])(
  "blocks commands during DELETE and recovers only on failure=%s",
  async (fails) => {
    await enableRemoteControl();
    await act(async () => route.back());
    await setRegion("chr1", 1000);
    const stream = latest();
    const deletion = server.hold("DELETE");
    await click('button[aria-label="Sessions"]');
    await click('button[aria-label="Actions for session Alpha"]');
    await act(async () =>
      [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')]
        .find((item) => item.textContent === "Delete")!
        .click(),
    );
    await vi.waitFor(() => expect(server.writes().at(-1)?.method).toBe("DELETE"));
    expect(stream.closed).toBe(true);
    const before = region();
    // A successful DELETE may already have committed while its response is delayed.
    if (!fails) server.stored.delete(alpha);
    await setRegion("chr6", 6000);
    expect(reply(server.replies.mock.calls.length - 1).result).toMatchObject({
      ok: false,
      code: "SESSION_CLOSED",
    });
    expect(region()).toBe(before);

    if (fails) {
      deletion.fail();
      await vi.waitFor(() => expect(latest()).not.toBe(stream));
      expect(heading()).toBe("Alpha");
      expect(region()).toBe(before);
      await setRegion("chr2", 2000);
      expect(reply(server.replies.mock.calls.length - 1).result.ok).toBe(true);
      await vi.waitFor(() =>
        expect(server.stored.get(alpha)!.snapshot.browser.region.chromosome).toBe("chr2"),
      );
    } else {
      deletion.release();
      await vi.waitFor(() => expect(heading()).not.toBe("Alpha"));
      expect(Stream.opened).toEqual([stream]);
    }
  },
);

it("budgets remote-control renders when a connected session is replaced", async () => {
  await enableRemoteControl();
  await act(async () => route.back());
  act(() => latest().onopen!());
  const report = await probe!.measure(async () => {
    await act(async () => route.push(`/browser/${beta}`));
    await vi.waitFor(() => expect(heading()).toBe("Beta"));
    act(() => latest().onopen!());
  });
  expect(report.pick("RemoteControlProvider", "AgentPanel", "BrowserView")).toMatchInlineSnapshot(`
    {
      "AgentPanel": 4,
      "BrowserView": 2,
      "RemoteControlProvider": 3,
    }
  `);
});
