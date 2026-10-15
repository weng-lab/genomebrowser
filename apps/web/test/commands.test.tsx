// @vitest-environment jsdom

import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Workspace } from "../components/workspace/Workspace";
import { BrowserSessionProvider } from "../browser/BrowserSession";
import { BrowserServer } from "../browser/BrowserServer";
import { BrowserPage } from "../app/(workspace)/browser/BrowserPage";
import SettingsPage from "../app/(workspace)/settings/page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/browser",
  useRouter: () => ({ replace: vi.fn() }),
}));

function TestShell({ settings = false }: { settings?: boolean }) {
  return (
    <StrictMode>
      <BrowserSessionProvider>
        <BrowserServer endpoint="/api" sessionId="local">
          <Workspace navigation={[]}>
            {settings ? <SettingsPage /> : <BrowserPage sessionId="local" />}
          </Workspace>
        </BrowserServer>
      </BrowserSessionProvider>
    </StrictMode>
  );
}

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// EventSource is the external transport boundary. Stores, command execution and UI remain real.
class Stream extends EventTarget {
  static opened: Stream[] = [];
  onerror: (() => void) | null = null;
  onopen: (() => void) | null = null;
  close = vi.fn<() => void>();
  constructor(readonly url: string) {
    super();
    Stream.opened.push(this);
  }
  send(type: string, data: unknown) {
    this.dispatchEvent(new MessageEvent(type, { data: JSON.stringify(data) }));
  }
}

const commandId = "e376d6ef-36c9-4d01-ad52-9847bad99f3c";
let container: HTMLDivElement;
let root: Root;
const post = vi.fn<typeof fetch>();

beforeEach(async () => {
  Stream.opened = [];
  post.mockReset().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
  vi.stubGlobal("EventSource", Stream);
  // No saved session; command replies go to `post`.
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
    init?.method === "POST"
      ? post(url, init)
      : Promise.resolve(Response.json({ error: "Not found" }, { status: 404 })),
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
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<TestShell />));
  act(() => Stream.opened.at(-1)!.onopen!());
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("applies an external region command in the real browser UI and replies with the whole session state", async () => {
  const region = { chromosome: "chr1", start: 1000, end: 2000 };
  await act(async () =>
    Stream.opened.at(-1)!.send("command", {
      commandId,
      name: "set_region",
      expiresAt: Date.now() + 5000,
      params: { region },
    }),
  );
  expect(container.querySelector('[aria-label="Visible region"]')!.textContent).toBe(
    "chr1:1,001-2,000",
  );
  expect(post).toHaveBeenCalledTimes(1);
  const [url, init] = post.mock.calls[0];
  expect(url).toBe("/api/sessions/local/rpc");
  expect(init!.headers).toMatchObject({ "Content-Type": "application/json" });
  const reply = JSON.parse(init!.body as string);
  expect(reply).toMatchObject({ commandId, result: { ok: true } });
  // The reply carries the whole session state after the command.
  expect(reply.result.state.browser.region).toEqual(region);
  expect(reply.result.state.tracks.map(({ base }: { base: { id: string } }) => base.id)).toEqual([
    "ruler",
    "genes",
    "ccres",
  ]);
  act(() => root.unmount());
  expect(Stream.opened.every((stream) => stream.close.mock.calls.length > 0)).toBe(true);
});

it("returns the store's rejection without changing the visible region", async () => {
  const before = container.querySelector('[aria-label="Visible region"]')!.textContent;
  await act(async () =>
    Stream.opened.at(-1)!.send("command", {
      commandId,
      name: "set_region",
      expiresAt: Date.now() + 5000,
      params: { region: { chromosome: "not-a-chromosome", start: 1000, end: 2000 } },
    }),
  );
  expect(container.querySelector('[aria-label="Visible region"]')!.textContent).toBe(before);
  expect(JSON.parse(post.mock.calls[0][1]!.body as string).result).toMatchObject({
    ok: false,
    code: "UNKNOWN_CHROMOSOME",
  });
});

it("does not apply commands that expired while the browser was suspended", async () => {
  const before = container.querySelector('[aria-label="Visible region"]')!.textContent;
  await act(async () =>
    Stream.opened.at(-1)!.send("command", {
      commandId,
      name: "set_region",
      expiresAt: Date.now() - 1000,
      params: { region: { chromosome: "chr1", start: 1000, end: 2000 } },
    }),
  );
  expect(container.querySelector('[aria-label="Visible region"]')!.textContent).toBe(before);
  expect(post).not.toHaveBeenCalled();
});

it("reconnects after the server becomes available again", async () => {
  vi.useFakeTimers();
  const previous = Stream.opened.at(-1)!;
  act(() => previous.onerror!());
  expect(previous.close).toHaveBeenCalled();
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  const current = Stream.opened.at(-1)!;
  expect(current).not.toBe(previous);
  act(() => current.onopen!());
  await act(async () =>
    current.send("command", {
      commandId,
      name: "set_region",
      expiresAt: Date.now() + 5000,
      params: { region: { chromosome: "chr2", start: 2000, end: 3000 } },
    }),
  );
  expect(container.querySelector('[aria-label="Visible region"]')!.textContent).toBe(
    "chr2:2,001-3,000",
  );
  expect(post.mock.calls[0][1]!.headers).toMatchObject({
    "Content-Type": "application/json",
  });
});

// Pages may unmount, but the shared layout keeps its stores and transport alive.
it("keeps one connection and accepts commands while the browser page is unmounted", async () => {
  const stream = Stream.opened.at(-1)!;
  const opened = Stream.opened.length;
  await act(async () => root.render(<TestShell settings />));
  expect(container.querySelector('[aria-label="Visible region"]')).toBeNull();
  await act(async () =>
    stream.send("command", {
      commandId,
      name: "set_region",
      expiresAt: Date.now() + 5000,
      params: { region: { chromosome: "chr3", start: 3000, end: 4000 } },
    }),
  );
  await act(async () => root.render(<TestShell />));
  expect(Stream.opened).toHaveLength(opened);
  expect(stream.close).not.toHaveBeenCalled();
  expect(container.querySelector('[aria-label="Visible region"]')!.textContent).toBe(
    "chr3:3,001-4,000",
  );
  expect(JSON.parse(post.mock.calls[0][1]!.body as string).result.ok).toBe(true);
});
