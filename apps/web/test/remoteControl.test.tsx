// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AgentPanel } from "../app/(workspace)/browser/AgentPanel";
import { SettingsView } from "../app/(workspace)/settings/SettingsView";
import { BrowserServer } from "../browser/BrowserServer";
import { BrowserSessionProvider } from "../browser/BrowserSession";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// Only the SSE and HTTP boundary is replaced.
class Stream extends EventTarget {
  static opened: Stream[] = [];
  onerror: (() => void) | null = null;
  onopen: (() => void) | null = null;
  close = vi.fn<() => void>();
  constructor(readonly url: string) {
    super();
    Stream.opened.push(this);
  }
}

let root: Root;
let container: HTMLDivElement;

beforeEach(async () => {
  Stream.opened = [];
  vi.stubGlobal("EventSource", Stream);
  vi.stubGlobal("fetch", () => Promise.resolve(Response.json({}, { status: 404 })));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(
      <BrowserSessionProvider>
        <BrowserServer endpoint="/api" sessionId="local">
          <SettingsView />
          <AgentPanel />
        </BrowserServer>
      </BrowserSessionProvider>,
    ),
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function text() {
  return container.textContent;
}
function toggle() {
  act(() => container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
}

it("connects the session's command stream by default and reports the connection", () => {
  expect(Stream.opened).toHaveLength(1);
  expect(Stream.opened[0].url).toBe("/api/sessions/local/rpc");
  expect(text()).toContain("Connecting…");
  act(() => Stream.opened[0].onopen!());
  expect(text()).toContain(`Connected. MCP tools called with sessionId "local" run in this tab.`);
});

it("turning remote control off closes the stream and turning it on opens a new one", () => {
  act(() => Stream.opened[0].onopen!());
  toggle();
  expect(Stream.opened[0].close).toHaveBeenCalled();
  expect(text()).toContain("Remote control is off.");
  toggle();
  expect(Stream.opened).toHaveLength(2);
  expect(text()).toContain("Connecting…");
});

it("keeps retrying while another tab holds the session", async () => {
  vi.useFakeTimers();
  // The server answers 409, which EventSource reports as an error.
  act(() => Stream.opened[0].onerror!());
  expect(Stream.opened[0].close).toHaveBeenCalled();
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  expect(Stream.opened).toHaveLength(2);
  act(() => Stream.opened[1].onopen!());
  expect(text()).toContain("Connected.");
});
