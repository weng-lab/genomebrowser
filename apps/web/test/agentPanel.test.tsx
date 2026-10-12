// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AgentPanel } from "../app/(workspace)/browser/AgentPanel";
import { BrowserCommands } from "../browser/BrowserCommands";
import { BrowserSessionProvider, useBrowserSession } from "../browser/BrowserSession";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// Keep the connection, command execution, and stores real; fixture only the HTTP/SSE boundary.
class Stream extends EventTarget {
  static current: Stream;
  onerror: (() => void) | null = null;
  close() {}
  constructor() {
    super();
    Stream.current = this;
  }
  send(type: string, data: unknown) {
    this.dispatchEvent(new MessageEvent(type, { data: JSON.stringify(data) }));
  }
}

function VisibleRegion() {
  const { useBrowserStore } = useBrowserSession();
  const region = useBrowserStore((state) => state.region);
  return <output aria-label="Test visible region">{JSON.stringify(region)}</output>;
}

const clientId = "ae2bf290-6942-4df0-baf2-5e6bd4b5c41f";
const commandId = "e376d6ef-36c9-4d01-ad52-9847bad99f3c";
let root: Root;
let container: HTMLDivElement;
const post = vi.fn<typeof fetch>();

beforeEach(async () => {
  post.mockReset().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
  vi.stubGlobal("fetch", post);
  vi.stubGlobal("EventSource", Stream);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(
      <BrowserSessionProvider>
        <BrowserCommands endpoint="/api/browser">
          <AgentPanel />
          <VisibleRegion />
        </BrowserCommands>
      </BrowserSessionProvider>,
    ),
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function connect() {
  act(() => Stream.current.send("connected", { clientId, snapshot: null }));
}
function submit() {
  return act(async () => {
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}
function setInput(value: string) {
  act(() => {
    const input = container.querySelector("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

it("sends a display region through HTTP, applies it only through SSE, and waits for acknowledgement", async () => {
  expect(container.querySelector("button")!.disabled).toBe(true);
  connect();
  setInput("chr1:1,001-2,000");
  const before = container.querySelector('[aria-label="Test visible region"]')!.textContent;
  let finish!: (response: Response) => void;
  post.mockImplementation((url) =>
    String(url).endsWith("/region")
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : Promise.resolve(new Response(JSON.stringify({ ok: true }))),
  );
  await submit();
  const [url, init] = post.mock.calls.find(([url]) => String(url).endsWith("/region"))!;
  expect(url).toBe(`/api/browser/clients/${clientId}/region`);
  expect(init!.headers).toMatchObject({ "Content-Type": "application/json" });
  const region = { chromosome: "chr1", start: 1000, end: 2000 };
  expect(JSON.parse(init!.body as string)).toEqual(region);
  expect(container.querySelector('[aria-label="Test visible region"]')!.textContent).toBe(before);
  expect(container.querySelector("button")!.disabled).toBe(true);
  await act(async () =>
    Stream.current.send("command", {
      commandId,
      type: "region.set",
      expiresAt: Date.now() + 5000,
      region,
    }),
  );
  expect(container.querySelector('[aria-label="Test visible region"]')!.textContent).toBe(
    JSON.stringify(region),
  );
  expect(container.textContent).not.toContain("Region set to");
  await act(async () =>
    finish(
      new Response(
        JSON.stringify({
          commandId,
          result: { ok: true, region, clamped: false },
        }),
      ),
    ),
  );
  expect(container.textContent).toContain("Region set to chr1:1,001-2,000.");
  expect(container.querySelector("button")!.disabled).toBe(false);
});

it("preserves invalid input without sending a request and shows server rejection", async () => {
  connect();
  setInput("bad region input");
  await submit();
  expect(post.mock.calls.some(([url]) => String(url).endsWith("/region"))).toBe(false);
  expect(container.querySelector("input")!.value).toBe("bad region input");
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  setInput("chrUnknown:1-100");
  post.mockResolvedValue(
    new Response(
      JSON.stringify({
        commandId,
        result: { ok: false, code: "UNKNOWN_CHROMOSOME", error: "Unknown chromosome" },
      }),
      { status: 422 },
    ),
  );
  await submit();
  expect(container.querySelector('[role="alert"]')!.textContent).toContain("Unknown chromosome");
  expect(container.querySelector("button")!.disabled).toBe(false);
});

it("aborts a pending command request when the panel unmounts", async () => {
  connect();
  post.mockImplementation((url) =>
    String(url).endsWith("/region")
      ? new Promise(() => {})
      : Promise.resolve(new Response(JSON.stringify({ ok: true }))),
  );
  await submit();
  const signal = post.mock.calls.find(([url]) => String(url).endsWith("/region"))![1]!.signal!;
  act(() => root.unmount());
  expect(signal.aborted).toBe(true);
});
