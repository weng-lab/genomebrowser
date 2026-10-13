// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AppProviders } from "../app/(workspace)/AppProviders";
import { useSessionId } from "../browser/BrowserServer";
import { useBrowserSession } from "../browser/BrowserSession";

const route = vi.hoisted(() => ({ params: {} as { sessionId?: string } }));
vi.mock("next/navigation", () => ({ useParams: () => route.params }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// Only the network is replaced; the providers, stores, and session selection are real.
class Stream extends EventTarget {
  static opened: string[] = [];
  onerror: (() => void) | null = null;
  onopen: (() => void) | null = null;
  close() {}
  constructor(url: string) {
    super();
    Stream.opened.push(url);
  }
}

let stores: unknown;
function CurrentSession() {
  stores = useBrowserSession();
  return <output>{useSessionId()}</output>;
}

let root: Root;
let container: HTMLDivElement;

async function visit(params: { sessionId?: string }) {
  route.params = params;
  await act(async () =>
    root.render(
      <AppProviders>
        <CurrentSession />
      </AppProviders>,
    ),
  );
  await vi.waitFor(() => expect(container.querySelector("output")).not.toBeNull());
  return container.querySelector("output")!.textContent;
}

beforeEach(() => {
  Stream.opened = [];
  vi.stubGlobal("EventSource", Stream);
  vi.stubGlobal("fetch", () => Promise.resolve(Response.json({}, { status: 404 })));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it("opens the default session before any session URL is visited", async () => {
  expect(await visit({})).toBe("local");
  expect(Stream.opened).toEqual(["/api/sessions/local/rpc"]);
});

it("follows the URL, keeps the session on pages without one, and resets stores on a new session", async () => {
  expect(await visit({ sessionId: "alpha" })).toBe("alpha");
  const alphaStores = stores;

  // Settings has no session in its URL; the session and its stores stay mounted.
  expect(await visit({})).toBe("alpha");
  expect(stores).toBe(alphaStores);

  expect(await visit({ sessionId: "not a valid id" })).toBe("alpha");
  expect(stores).toBe(alphaStores);

  expect(await visit({ sessionId: "beta" })).toBe("beta");
  expect(stores).not.toBe(alphaStores);
  expect(Stream.opened.at(-1)).toBe("/api/sessions/beta/rpc");
});
