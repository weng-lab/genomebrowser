// @vitest-environment jsdom

// Import first: it mocks the Next.js router before the app's modules load.
import { route, stubLayout, WorkspaceApp } from "./workspaceApp";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { act, useLayoutEffect } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createStores } from "../assemblies/assemblies";
import { snapshot } from "../browser/snapshot";
import { useSession } from "../sessions/SessionProvider";
import { installSessionServer, type SessionServer } from "./sessionServer";

// EventSource and fetch are the external boundaries. The session owner, remote
// control attachment, command execution, stores, and UI are real.
class Stream extends EventTarget {
  static opened: Stream[] = [];
  static log: string[] = [];
  onerror: (() => void) | null = null;
  onopen: (() => void) | null = null;
  closed = false;
  constructor(readonly url: string) {
    super();
    Stream.opened.push(this);
    Stream.log.push(`open ${url}`);
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
const reply = (call = 0) => JSON.parse(server.rpc.mock.calls[call][1].body as string);
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
async function enableRemoteControl() {
  await click('nav a[aria-label="Settings"]');
  await click('input[type="checkbox"]');
}

beforeEach(async () => {
  Stream.opened = [];
  Stream.log = [];
  vi.stubGlobal("EventSource", Stream);
  server = installSessionServer();
  stubLayout();
  alpha = server.add("Alpha", defaults());
  beta = server.add("Beta", defaults());
  route.reset(`/browser/${alpha}`);
  probe = await renderWithProbe(<WorkspaceApp />);
  await vi.waitFor(() => {
    if (heading() !== "Alpha") throw new Error("Alpha is not open yet");
  });
});

afterEach(() => {
  probe?.unmount();
  probe = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("is off by default; sessions open and save without it", async () => {
  expect(Stream.opened).toEqual([]);
  expect(text()).toContain("Remote control is off. Turn it on in Settings.");
  await click('button[aria-label="Pan right"]');
  await vi.waitFor(() => expect(server.writes().map(({ method }) => method)).toEqual(["PUT"]));
});

it("attaches to the open session only once restored, and leaves it before attaching to the next", async () => {
  await enableRemoteControl();
  expect(Stream.log).toEqual([`open /api/sessions/${alpha}/rpc`]);
  expect(text()).toContain("Connecting…");
  act(() => latest().onopen!());
  expect(text()).toContain("Connected");

  const load = server.hold("GET");
  await act(async () => route.push(`/browser/${beta}`));
  expect(Stream.log).toHaveLength(1);
  load.release();
  await vi.waitFor(() => expect(heading()).toBe("Beta"));
  expect(Stream.log).toEqual([
    `open /api/sessions/${alpha}/rpc`,
    `close /api/sessions/${alpha}/rpc`,
    `open /api/sessions/${beta}/rpc`,
  ]);
  act(() => latest().onopen!());
  expect(text()).toContain(`Connected. MCP tools called with sessionId "${beta}" run in this tab.`);

  await click('nav a[aria-label="Settings"]');
  await click('input[type="checkbox"]');
  expect(latest().closed).toBe(true);
  expect(text()).toContain("Off");
});

it("applies a region command in the browser, replies with the whole state, and saves it", async () => {
  await enableRemoteControl();
  await act(async () => route.back());
  await setRegion("chr1", 1000);
  expect(region()).toBe("chr1:1,001-2,000");
  expect(server.rpc.mock.calls[0][0]).toBe(`/api/sessions/${alpha}/rpc`);
  expect(reply()).toMatchObject({ commandId, result: { ok: true } });
  expect(reply().result.state.browser.region).toEqual({
    chromosome: "chr1",
    start: 1000,
    end: 2000,
  });
  expect(reply().result.state.tracks.map(({ base }: { base: { id: string } }) => base.id)).toEqual([
    "ruler",
    "genes",
    "ccres",
  ]);
  await vi.waitFor(() =>
    expect(server.stored.get(alpha)!.snapshot.browser.region.start).toBe(1000),
  );
});

it("returns the store's rejection and ignores expired commands without changing the region", async () => {
  await enableRemoteControl();
  await act(async () => route.back());
  const before = region();
  await setRegion("not-a-chromosome", 1000);
  expect(reply().result).toMatchObject({ ok: false, code: "UNKNOWN_CHROMOSOME" });
  await setRegion("chr1", 1000, Date.now() - 1000);
  expect(server.rpc).toHaveBeenCalledTimes(1);
  expect(region()).toBe(before);
});

it("keeps saving while the MCP server is unavailable, then reconnects", async () => {
  await enableRemoteControl();
  await act(async () => route.back());
  const first = latest();
  act(() => first.onerror!());
  expect(first.closed).toBe(true);
  await click('button[aria-label="Pan right"]');
  await vi.waitFor(() => expect(server.writes()).toHaveLength(1));
  await vi.waitFor(() => expect(latest()).not.toBe(first), { timeout: 2000 });
  act(() => latest().onopen!());
  await setRegion("chr2", 2000);
  expect(region()).toBe("chr2:2,001-3,000");
});

/** Sends a command to the open connection when `id` opens, before effects clean up. */
function CommandOnOpen({ id }: { id: string }) {
  const active = useSession((session) => session.active?.id);
  useLayoutEffect(() => {
    if (active !== id) return;
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

  expect(server.rpc.mock.calls[0][0]).toBe(`/api/sessions/${alpha}/rpc`);
  expect(reply().result).toMatchObject({ ok: false, code: "SESSION_CLOSED" });
  expect(stream.closed).toBe(true);
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
