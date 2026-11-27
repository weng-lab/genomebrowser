// @vitest-environment jsdom

// Import first: it mocks the Next.js router before the app's modules load.
import { clerk, route, stubLayout, WorkspaceApp } from "./workspaceApp";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { act, useLayoutEffect } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createStores } from "../features/assemblies/assemblies";
import { maxSessionTracks } from "../features/sessions/schema";
import { snapshot } from "../features/sessions/storeSnapshot";
import { useSession } from "../features/sessions/SessionProvider";
import { installSessionServer, type SessionServer } from "./sessionServer";
import { bigBedWithColumns, trackFiles as files } from "./trackFiles";

// EventSource and fetch are the external boundaries. The session owner, remote
// control attachment, command execution, stores, and UI are real.
class Stream extends EventTarget {
  static opened: Stream[] = [];
  static log: string[] = [];
  static events: Stream[] = [];
  onerror: (() => void) | null = null;
  onopen: (() => void) | null = null;
  closed = false;
  /** The stream path, without query parameters. */
  readonly url: string;
  /** The tab this connection belongs to. */
  readonly tab: string | null;
  private readonly isCommandStream: boolean;
  constructor(url: string) {
    super();
    const parsed = new URL(url, "http://localhost");
    this.url = parsed.pathname;
    this.tab = parsed.searchParams.get("tab");
    this.isCommandStream = this.url.endsWith("/commands");
    if (this.isCommandStream) {
      Stream.opened.push(this);
      Stream.log.push(`open ${this.url}`);
    } else {
      Stream.events.push(this);
    }
  }
  close() {
    this.closed = true;
    if (this.isCommandStream) Stream.log.push(`close ${this.url}`);
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
  Stream.events = [];
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
  await click('button[aria-label="Highlight"]');
  await vi.waitFor(() => expect(server.writes().map(({ method }) => method)).toEqual(["PATCH"]));

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

/** Change Alpha's region on the server, as an MCP state tool does, and announce the revision. */
async function serverSetsRegion(chromosome: string, start: number) {
  const stored = server.stored.get(alpha)!;
  stored.revision += 1;
  stored.snapshot = {
    ...stored.snapshot,
    browser: { ...stored.snapshot.browser, region: { chromosome, start, end: start + 1000 } },
  };
  const events = Stream.events.filter(
    (stream) => stream.url === `/api/sessions/${alpha}/events` && !stream.closed,
  );
  await act(async () => {
    for (const stream of events) {
      stream.dispatchEvent(
        new MessageEvent("updated", {
          data: JSON.stringify({ type: "updated", revision: stored.revision }),
        }),
      );
    }
  });
}

it("locks the browser while an agent holds control, until it releases it or the user takes it back", async () => {
  await enableRemoteControl();
  await act(async () => route.back());
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));
  const control = (name: string, id: string) =>
    act(async () =>
      latest().send({ commandId: id, name, expiresAt: Date.now() + 5000, params: {} }),
    );
  // The browser and its toolbar, and the saved regions, lock; the agent panel does not.
  const locked = () =>
    Boolean(document.querySelector("main [inert]")) &&
    Boolean(document.querySelector("#left-panel [inert]"));
  const unlocked = () => document.querySelectorAll("[inert]").length === 0;
  expect(unlocked()).toBe(true);

  await control("take_control", "0b6f0bd5-9a77-4a43-9d21-0c7a3c3d0e01");
  await vi.waitFor(() => expect(locked()).toBe(true));
  // No run of the agent panel took it, so the tab cannot stop this agent and says so.
  expect(text()).toContain(
    "An agent has control of the browser. Taking it back does not stop the agent.",
  );
  expect(reply()).toMatchObject({ result: { ok: true, value: { held: true } } });
  // The agent's own edits, which state tools make on the server, still reach the browser.
  await serverSetsRegion("chr1", 1000);
  await vi.waitFor(() => expect(region()).toBe("chr1:1,001-2,000"));

  expect(document.querySelector("#right-panel [inert]")).toBeNull();

  await control("release_control", "0b6f0bd5-9a77-4a43-9d21-0c7a3c3d0e02");
  await vi.waitFor(() => expect(unlocked()).toBe(true));

  // A dialog the user had open, which renders outside the locked browser, closes.
  await act(async () =>
    [...document.querySelectorAll("button")]
      .find((button) => button.textContent === "Sort tracks")!
      .click(),
  );
  await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).not.toBeNull());

  await control("take_control", "0b6f0bd5-9a77-4a43-9d21-0c7a3c3d0e03");
  await vi.waitFor(() => expect(locked()).toBe(true));
  await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
  await act(async () =>
    [...document.querySelectorAll("button")]
      .find((button) => button.textContent === "Take back control")!
      .click(),
  );
  await vi.waitFor(() => expect(unlocked()).toBe(true));
});

it("lets only the agent holding control give it back", async () => {
  await enableRemoteControl();
  await act(async () => route.back());
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));
  const control = (name: string, id: string, agent?: "panel" | "external") =>
    act(async () =>
      latest().send({ commandId: id, name, expiresAt: Date.now() + 5000, params: {}, agent }),
    );
  const held = () => document.querySelectorAll("[inert]").length > 0;

  // An agent connected another way holds control; the agent panel's run ending does not lift it.
  await control("take_control", "0b6f0bd5-9a77-4a43-9d21-0c7a3c3d0e11");
  await vi.waitFor(() => expect(held()).toBe(true));
  await control("release_control", "0b6f0bd5-9a77-4a43-9d21-0c7a3c3d0e12", "panel");
  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(2));
  expect(reply(1)).toMatchObject({ result: { ok: true } });
  expect(held()).toBe(true);
  await control("release_control", "0b6f0bd5-9a77-4a43-9d21-0c7a3c3d0e13", "external");
  await vi.waitFor(() => expect(held()).toBe(false));

  await control("take_control", "0b6f0bd5-9a77-4a43-9d21-0c7a3c3d0e14", "panel");
  await vi.waitFor(() => expect(held()).toBe(true));
  await control("release_control", "0b6f0bd5-9a77-4a43-9d21-0c7a3c3d0e15", "external");
  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(5));
  expect(held()).toBe(true);
  await control("release_control", "0b6f0bd5-9a77-4a43-9d21-0c7a3c3d0e16", "panel");
  await vi.waitFor(() => expect(held()).toBe(false));
});

it("gives control back when remote control detaches from the session", async () => {
  await enableRemoteControl();
  await act(async () => route.back());
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));
  await act(async () =>
    latest().send({
      commandId: "0b6f0bd5-9a77-4a43-9d21-0c7a3c3d0e04",
      name: "take_control",
      expiresAt: Date.now() + 5000,
      params: {},
    }),
  );
  await vi.waitFor(() => expect(document.querySelectorAll("[inert]").length).toBeGreaterThan(0));
  await act(async () => route.push(`/browser/${beta}`));
  await vi.waitFor(() => expect(heading()).toBe("Beta"));
  expect(document.querySelectorAll("[inert]").length).toBe(0);
});

it("rejects unknown, server-only, invalid, and expired commands on the tab stream", async () => {
  server.files.set(`${dataHost}/signal.bw`, files.bigWig);
  await enableRemoteControl();
  await act(async () => route.back());
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
      params: { region: { chromosome: "chr1", start: 1000, end: 2000 } },
    }),
  );
  await act(async () =>
    latest().send({
      commandId,
      name: "export_image",
      expiresAt: Date.now() + 5000,
      params: { format: "gif" },
    }),
  );
  await addTracks([{ url: `${dataHost}/signal.bw` }], Date.now() - 1000);
  expect(server.replies).toHaveBeenCalledTimes(3);
  expect(reply(0).result).toMatchObject({ ok: false, code: "UNKNOWN_COMMAND" });
  expect(reply(1).result).toMatchObject({ ok: false, code: "UNKNOWN_COMMAND" });
  expect(reply(2).result).toMatchObject({ ok: false, code: "INVALID_PARAMS" });
  expect(savedTracks().map(({ base }) => base.title)).toEqual(startingTitles);
});

const dataHost = "https://data.example.test";
const addTracksCommand = (tracks: object[], expiresAt = Date.now() + 5000) => ({
  commandId: crypto.randomUUID(),
  name: "add_tracks_from_urls",
  expiresAt,
  params: { tracks },
});
const addTracks = (tracks: object[], expiresAt?: number) =>
  act(async () => latest().send(addTracksCommand(tracks, expiresAt)));
const savedTracks = () => server.stored.get(alpha)!.snapshot.tracks;
const startingTitles = ["Coordinates", "GENCODE 50 basic", "Human cCREs"];

// Each row is a file URL an agent might add, and the track the session saves for it.
const additions: {
  url: string;
  hosted: Record<string, Uint8Array>;
  params: object;
  saved: { type: string; title: string; config: object; base?: object; metadata?: object };
}[] = [
  {
    url: `${dataHost}/tracks/ENCFF001ABC.bigWig`,
    hosted: { [`${dataHost}/tracks/ENCFF001ABC.bigWig`]: files.bigWig },
    params: {},
    saved: { type: "bigwig", title: "ENCFF001ABC", config: {} },
  },
  {
    // A BigBed track reads the columns its header declares.
    url: `${dataHost}/peaks.bb`,
    hosted: { [`${dataHost}/peaks.bb`]: files.bed6 },
    params: {},
    saved: { type: "bigbed", title: "peaks", config: { bedSchema: "bed6" } },
  },
  {
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
    url: `${dataHost}/download?id=7`,
    hosted: { [`${dataHost}/download?id=7`]: files.bigWig },
    params: { type: "bigwig", title: "Signal" },
    saved: { type: "bigwig", title: "Signal", config: {} },
  },
  // A request's own choices. Each visibility shows as a display other than the type's default.
  {
    // The given columns are read, though the header declares six.
    url: `${dataHost}/named.bb`,
    hosted: { [`${dataHost}/named.bb`]: files.bed6 },
    params: {
      bedSchema: "bed4",
      color: "#aa3300",
      visibility: "pack",
      metadata: { Assay: "ChIP-seq", Replicate: 2, Interesting: true },
    },
    saved: {
      type: "bigbed",
      title: "named",
      config: { bedSchema: "bed4" },
      base: { color: "#aa3300", display: "squish" },
      metadata: { Assay: "ChIP-seq", Replicate: 2, Interesting: true },
    },
  },
  {
    url: `${dataHost}/coverage.bw`,
    hosted: { [`${dataHost}/coverage.bw`]: files.bigWig },
    params: { visibility: "dense" },
    saved: { type: "bigwig", title: "coverage", config: {}, base: { display: "dense" } },
  },
  {
    url: `${dataHost}/genes.bb`,
    hosted: { [`${dataHost}/genes.bb`]: bigBedWithColumns(20, 12) },
    params: { type: "gene", visibility: "pack" },
    saved: { type: "gene", title: "genes", config: {}, base: { display: "tagged" } },
  },
  {
    url: `${dataHost}/ccres.bb`,
    hosted: { [`${dataHost}/ccres.bb`]: bigBedWithColumns(10, 9) },
    params: { type: "ccre-bigbed", visibility: "full" },
    saved: { type: "ccre-bigbed", title: "ccres", config: {}, base: { display: "squish" } },
  },
  {
    url: `${dataHost}/aligned.bam`,
    hosted: { [`${dataHost}/aligned.bam`]: files.bam, [`${dataHost}/aligned.bam.bai`]: files.bai },
    params: { visibility: "dense" },
    saved: {
      type: "bam",
      title: "aligned",
      config: { indexUrl: `${dataHost}/aligned.bam.bai` },
      base: { display: "dense" },
    },
  },
];

it("adds a batch of tracks for the agent in order, and saves them", async () => {
  for (const { hosted } of additions)
    for (const [url, file] of Object.entries(hosted)) server.files.set(url, file);
  await enableRemoteControl();

  await addTracks(additions.map(({ url, params }) => ({ url, ...params })));

  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(1));
  const { result } = reply();
  expect(result).toEqual({
    ok: true,
    value: {
      tracks: additions.map(({ saved }) => ({
        id: expect.any(String),
        title: saved.title,
        type: saved.type,
      })),
    },
  });
  await vi.waitFor(() =>
    expect(savedTracks()).toHaveLength(startingTitles.length + additions.length),
  );
  expect(savedTracks().slice(startingTitles.length)).toEqual(
    additions.map(({ url, saved }, index) =>
      expect.objectContaining({
        type: saved.type,
        base: expect.objectContaining({
          id: result.value.tracks[index].id,
          title: saved.title,
          ...saved.base,
        }),
        source: "user",
        config: expect.objectContaining({ url, ...saved.config }),
        ...(saved.metadata && { metadata: saved.metadata }),
      }),
    ),
  );
});

// State tools read the saved session, so a tool the agent calls next must find the tracks there.
it("replies that tracks were added only once the session has saved them, through a failed write", async () => {
  server.files.set(`${dataHost}/signal.bw`, files.bigWig);
  await enableRemoteControl();
  const save = server.hold("PATCH");

  await addTracks([{ url: `${dataHost}/signal.bw` }]);

  await vi.waitFor(() => expect(server.writes().map(({ method }) => method)).toEqual(["PATCH"]));
  expect(server.replies).not.toHaveBeenCalled();
  // A transient failure retries, and the reply keeps waiting for it.
  await act(async () => save.fail(503));
  await vi.waitFor(() => expect(server.writes()).toHaveLength(2), { timeout: 3000 });
  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(1));
  expect(reply().result).toMatchObject({ ok: true, value: { tracks: [{ title: "signal" }] } });
  expect(savedTracks().map(({ base }) => base.title)).toEqual([...startingTitles, "signal"]);
});

it("tells the agent when the session cannot save the tracks it added", async () => {
  server.files.set(`${dataHost}/signal.bw`, files.bigWig);
  await enableRemoteControl();
  server
    .hold("PATCH")
    .respond(
      Response.json(
        { code: "INVALID_INPUT", message: "Sessions are limited to 1 MB" },
        { status: 413 },
      ),
    );

  await addTracks([{ url: `${dataHost}/signal.bw` }]);

  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(1));
  expect(reply().result).toEqual({
    ok: false,
    code: "NOT_SAVED",
    error:
      "The browser made the change, but the session could not save it: Sessions are limited to 1 MB",
  });
  expect(savedTracks().map(({ base }) => base.title)).toEqual(startingTitles);
});

it("tells the agent why each URL in a batch cannot be added, and adds none of the batch", async () => {
  server.files.set(`${dataHost}/missing.bw`, 404);
  server.files.set(`${dataHost}/peaks.bb`, files.bed6);
  server.files.set(`${dataHost}/signal.bw`, files.bigWig);
  await enableRemoteControl();
  const failures = [
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
    {
      // Each value is within its own limit; together they pass the track's.
      params: {
        url: `${dataHost}/signal.bw`,
        metadata: Object.fromEntries(
          Array.from({ length: 10 }, (_, index) => [`Note ${index}`, "x".repeat(1000)]),
        ),
      },
      code: "METADATA_TOO_LARGE",
      error: "The metadata is more than 10,000 bytes as JSON. Remove fields or shorten values.",
    },
  ];

  await addTracks([{ url: `${dataHost}/signal.bw` }, ...failures.map(({ params }) => params)]);

  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(1));
  const reasons = failures.map(({ params, code, error }) => `${params.url}: ${code}: ${error}`);
  expect(reply().result).toEqual({
    ok: false,
    code: "TRACKS_NOT_ADDED",
    error: `No tracks were added. ${reasons.join(" ")}`,
  });
  // The session saves the whole track list, so a later add shows the batch added nothing.
  await addTracks([{ url: `${dataHost}/signal.bw` }]);
  await vi.waitFor(() =>
    expect(savedTracks().map(({ base }) => base.title)).toEqual([...startingTitles, "signal"]),
  );
});

it("adds nothing from a batch whose checks outlast its command", async () => {
  server.files.set(`${dataHost}/slow.bw`, "silent");
  server.files.set(`${dataHost}/signal.bw`, files.bigWig);
  await enableRemoteControl();

  await addTracks(
    [{ url: `${dataHost}/signal.bw` }, { url: `${dataHost}/slow.bw` }],
    Date.now() + 100,
  );

  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(1));
  expect(reply().result).toEqual({
    ok: false,
    code: "CANCELLED",
    error: "Adding the tracks was cancelled.",
  });
  await addTracks([{ url: `${dataHost}/signal.bw` }]);
  await vi.waitFor(() =>
    expect(savedTracks().map(({ base }) => base.title)).toEqual([...startingTitles, "signal"]),
  );
});

it("refuses a batch the session has no room for, including batches that finish checking together", async () => {
  for (const name of ["a", "b", "c", "d"]) server.files.set(`${dataHost}/${name}.bw`, files.bigWig);
  const { tracks } = server.stored.get(alpha)!.snapshot;
  const [ruler] = tracks;
  // Leave room for two more tracks.
  tracks.push(
    ...Array.from({ length: maxSessionTracks - tracks.length - 2 }, (_, index) => ({
      ...ruler,
      base: { ...ruler.base, id: `ruler-${index}` },
    })),
  );
  await reload();
  await enableRemoteControl();
  const bigWigs = (...names: string[]) => names.map((name) => ({ url: `${dataHost}/${name}.bw` }));
  const refused = (count: number, adding: number) => ({
    ok: false,
    code: "TRACK_LIMIT",
    error: `A session holds at most ${maxSessionTracks} tracks. This one has ${count}, which leaves room for ${maxSessionTracks - count}, not ${adding}. No tracks were added.`,
  });

  await addTracks(bigWigs("a", "b", "c"));
  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(1));
  expect(reply(0).result).toEqual(refused(maxSessionTracks - 2, 3));

  // Both start while the session has room for either batch, but not both.
  await act(async () => {
    latest().send(addTracksCommand(bigWigs("a", "b")));
    latest().send(addTracksCommand(bigWigs("c", "d")));
  });
  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(3));
  expect([reply(1).result, reply(2).result]).toEqual(
    expect.arrayContaining([expect.objectContaining({ ok: true }), refused(maxSessionTracks, 2)]),
  );

  // An unhosted URL would fail its check, so this shows a full session refuses before checking.
  await addTracks(bigWigs("unhosted"));
  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(4));
  expect(reply(3).result).toEqual(refused(maxSessionTracks, 1));
  await vi.waitFor(() => expect(savedTracks()).toHaveLength(maxSessionTracks));
});

it("keeps saving while the command stream is unavailable, then reconnects", async () => {
  server.files.set(`${dataHost}/signal.bw`, files.bigWig);
  await enableRemoteControl();
  await act(async () => route.back());
  const first = latest();
  act(() => first.onerror!());
  expect(first.closed).toBe(true);
  await click('button[aria-label="Highlight"]');
  await vi.waitFor(() => expect(server.writes()).toHaveLength(1));
  await vi.waitFor(() => expect(latest()).not.toBe(first), { timeout: 2000 });
  // A reconnect belongs to the same tab, so it replaces that tab's connection.
  expect(latest().tab).toBe(first.tab);
  act(() => latest().onopen!());
  await addTracks([{ url: `${dataHost}/signal.bw` }]);
  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(1));
  expect(reply().result.ok).toBe(true);
  await vi.waitFor(() =>
    expect(savedTracks().map(({ base }) => base.title)).toEqual([...startingTitles, "signal"]),
  );
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
    await exportImage({});
    await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(1));
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
    server.files.set(`${dataHost}/signal.bw`, files.bigWig);
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
    await addTracks([{ url: `${dataHost}/signal.bw` }]);
    await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(1));
    await click('button[aria-label="Pan right"]');
    const edited = region();
    expect(edited).toBeTruthy();
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
    latest().send(addTracksCommand([{ url: `${dataHost}/signal.bw` }]));
  }, [active, id]);
  return null;
}

it("rejects a command for a session replaced before remote control detaches from it", async () => {
  server.files.set(`${dataHost}/signal.bw`, files.bigWig);
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
  expect(savedTracks().map(({ base }) => base.title)).toEqual(startingTitles);
  expect(server.stored.get(beta)!.snapshot.tracks.map(({ base }) => base.title)).toEqual(
    startingTitles,
  );
});

it("keeps one connection and accepts commands while the browser page is unmounted", async () => {
  server.files.set(`${dataHost}/signal.bw`, files.bigWig);
  await enableRemoteControl();
  const stream = latest();
  await addTracks([{ url: `${dataHost}/signal.bw` }]);
  await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(1));
  expect(region()).toBeUndefined();
  expect(reply().result.ok).toBe(true);
  await act(async () => route.back());
  expect(Stream.opened).toEqual([stream]);
  await vi.waitFor(() =>
    expect(savedTracks().map(({ base }) => base.title)).toEqual([...startingTitles, "signal"]),
  );
});

it("detaches when the account menu signs out, and old commands cannot run", async () => {
  server.files.set(`${dataHost}/signal.bw`, files.bigWig);
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
  await act(async () => stream.send(addTracksCommand([{ url: `${dataHost}/signal.bw` }])));
  expect(server.replies).not.toHaveBeenCalled();
  expect(Stream.opened.filter(({ url }) => url === `/api/sessions/${alpha}/commands`)).toEqual([
    stream,
  ]);
  expect(savedTracks().map(({ base }) => base.title)).toEqual(startingTitles);
});

it("detaches when the account changes elsewhere and the workspace remounts", async () => {
  server.files.set(`${dataHost}/signal.bw`, files.bigWig);
  await enableRemoteControl();
  await act(async () => route.back());
  const stream = latest();
  server.user = "user_bob";
  act(() => clerk.signIn("user_bob"));
  expect(stream.closed).toBe(true);
  // Its stream is closed, so the server fails the command; a late event runs nothing.
  await addTracks([{ url: `${dataHost}/signal.bw` }]);
  expect(server.replies).not.toHaveBeenCalled();
  expect(savedTracks().map(({ base }) => base.title)).toEqual(startingTitles);
});

it("detaches once the session's edits can no longer be saved", async () => {
  server.files.set(`${dataHost}/signal.bw`, files.bigWig);
  await enableRemoteControl();
  await act(async () => route.back());
  const stream = latest();
  act(() => stream.onopen!());
  await act(async () =>
    stream.send({
      commandId: "0b6f0bd5-9a77-4a43-9d21-0c7a3c3d0e05",
      name: "take_control",
      expiresAt: Date.now() + 5000,
      params: {},
    }),
  );
  await vi.waitFor(() => expect(document.querySelectorAll("[inert]").length).toBeGreaterThan(0));
  server.stored.delete(alpha);
  await click('button[aria-label="Highlight"]');
  await vi.waitFor(() => expect(stream.closed).toBe(true));
  expect(text()).toContain(
    "This session's changes can no longer be saved, so agents cannot control it.",
  );
  // No agent reaches the session now, so it holds nothing.
  expect(document.querySelectorAll("[inert]").length).toBe(0);
  await addTracks([{ url: `${dataHost}/signal.bw` }]);
  expect(reply(1).result).toMatchObject({ ok: false, code: "SESSION_CLOSED" });
  expect(Stream.opened).toEqual([stream]);
});

it.each([false, true])(
  "blocks commands during DELETE and recovers only on failure=%s",
  async (fails) => {
    server.files.set(`${dataHost}/signal.bw`, files.bigWig);
    server.files.set(`${dataHost}/after.bw`, files.bigWig);
    await enableRemoteControl();
    await act(async () => route.back());
    await addTracks([{ url: `${dataHost}/signal.bw` }]);
    await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(1));
    await vi.waitFor(() =>
      expect(savedTracks().map(({ base }) => base.title)).toEqual([...startingTitles, "signal"]),
    );
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
    // A successful DELETE may already have committed while its response is delayed.
    if (!fails) server.stored.delete(alpha);
    await addTracks([{ url: `${dataHost}/after.bw` }]);
    expect(reply(server.replies.mock.calls.length - 1).result).toMatchObject({
      ok: false,
      code: "SESSION_CLOSED",
    });

    if (fails) {
      deletion.fail();
      await vi.waitFor(() => expect(latest()).not.toBe(stream));
      expect(heading()).toBe("Alpha");
      expect(savedTracks().map(({ base }) => base.title)).toEqual([...startingTitles, "signal"]);
      await addTracks([{ url: `${dataHost}/after.bw` }]);
      await vi.waitFor(() => expect(server.replies).toHaveBeenCalledTimes(3));
      expect(reply(2).result.ok).toBe(true);
      await vi.waitFor(() =>
        expect(savedTracks().map(({ base }) => base.title)).toEqual([
          ...startingTitles,
          "signal",
          "after",
        ]),
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
