// @vitest-environment jsdom

import { SWRConfig } from "swr";
import { act, useState } from "react";
import type { ReactNode } from "react";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AppProviders } from "../app/(workspace)/AppProviders";
import { useSessionId, useSessionSaveState } from "../browser/BrowserServer";
import { useBrowserSession, type BrowserSession } from "../browser/BrowserSession";
import { snapshot } from "../browser/snapshot";
import { PanelStateProvider, usePanelState } from "../components/workspace/panels/panelState";
import { SidePanel } from "../components/workspace/panels/SidePanel";
import { SessionPanel } from "../app/(workspace)/browser/SessionPanel";

const route = vi.hoisted(() => ({
  params: { sessionId: "testsession" },
  navigate: (_href: string) => {},
}));
vi.mock("next/navigation", () => ({
  useParams: () => route.params,
  useRouter: () => ({ replace: route.navigate }),
}));
// Replace only Next's navigation boundary; session selection, persistence and stores stay real.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onNavigate,
    ...props
  }: {
    href: string;
    children: ReactNode;
    onNavigate?: (event: { preventDefault: () => void }) => void;
  }) => (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        let prevented = false;
        onNavigate?.({
          preventDefault: () => {
            prevented = true;
          },
        });
        if (!prevented) route.navigate(href);
      }}
    >
      {children}
    </a>
  ),
}));

let probe: Probe | undefined;
let session: BrowserSession;
let ids: string[];
let togglePanel: (side: "left" | "right") => void;
let listResponse: () => Promise<Response>;
let deleteResponse: (url: string) => Promise<Response>;

function SessionControls() {
  session = useBrowserSession();
  togglePanel = usePanelState((state) => state.toggle);
  const open = usePanelState((state) => state.leftOpen);
  return (
    <>
      <output>{useSessionId()}</output>
      <output data-testid="save-state">{useSessionSaveState()}</output>
      <SidePanel
        side="left"
        open={open}
        animate={false}
        panel={{ title: "Sessions", children: <SessionPanel /> }}
      />
    </>
  );
}
function TestApp() {
  const [swr] = useState(() => ({
    provider: () => new Map(),
    dedupingInterval: 0,
    focusThrottleInterval: 0,
    shouldRetryOnError: false,
  }));
  const [sessionId, setSessionId] = useState("testsession");
  const [pathname, setPathname] = useState("/browser/testsession");
  route.params = { sessionId };
  route.navigate = (href) => {
    setPathname(href);
    if (href.startsWith("/browser/")) setSessionId(href.split("/").at(-1)!);
  };
  return (
    <SWRConfig value={swr}>
      <PanelStateProvider>
        <AppProviders>
          {pathname.startsWith("/browser/") ? <SessionControls /> : <main>Settings</main>}
        </AppProviders>
      </PanelStateProvider>
    </SWRConfig>
  );
}

beforeEach(() => {
  ids = ["local", "niship", "testsession"];
  deleteResponse = async (url) => {
    ids = ids.filter((id) => url !== `/api/sessions/${id}`);
    return Response.json({ ok: true });
  };
  listResponse = async () => Response.json(ids);
  vi.stubGlobal(
    "EventSource",
    class extends EventTarget {
      onopen = null;
      onerror = null;
      close() {}
    },
  );
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
    if (url === "/api/sessions") return listResponse();
    if (init?.method === "DELETE") return deleteResponse(url);
    if (init?.method === "PUT") return Promise.resolve(Response.json({ ok: true }));
    if (url === "/api/sessions/niship") {
      const saved = snapshot(session);
      saved.browser.region = { chromosome: "chr12", start: 10000, end: 20000 };
      return Promise.resolve(Response.json(saved));
    }
    return Promise.resolve(Response.json({}, { status: 404 }));
  });
});

afterEach(() => {
  probe?.unmount();
  probe = undefined;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// A region change through the browser store does not change session names or selection.
it("does not render the session list for a region change", async () => {
  probe = await renderWithProbe(<TestApp />);
  const report = await probe.measure(() =>
    session.useBrowserStore
      .getState()
      .setRegion({ chromosome: "chr1", start: 100000, end: 200000 }),
  );
  expect(report.pick("SessionPanel")).toMatchInlineSnapshot(`
    {
      "SessionPanel": 0,
    }
  `);
});

it("opens a saved session from its link and restores its region in fresh stores", async () => {
  probe = await renderWithProbe(<TestApp />);
  const links = [...document.body.querySelectorAll<HTMLAnchorElement>("a")];
  expect(links.map((link) => link.getAttribute("href"))).toEqual([
    "/browser/local",
    "/browser/niship",
    "/browser/testsession",
  ]);
  expect(document.body.querySelector('[aria-current="page"]')?.textContent).toContain(
    "testsession",
  );
  const originalStores = session;
  await probe.measure(() => links[1].click());
  expect(document.body.querySelector("output")?.textContent).toBe("niship");
  expect(document.body.querySelector('[aria-current="page"]')?.getAttribute("href")).toBe(
    "/browser/niship",
  );
  expect(session).not.toBe(originalStores);
  expect(session.useBrowserStore.getState().region).toEqual({
    chromosome: "chr12",
    start: 10000,
    end: 20000,
  });
});

it("includes the current unsaved session and refreshes saved names on window focus", async () => {
  ids = [];
  probe = await renderWithProbe(<TestApp />);
  expect(document.body.querySelectorAll("a")).toHaveLength(1);
  ids = ["niship", "testsession"];
  await probe.measure(async () => {
    window.dispatchEvent(new Event("focus"));
    await new Promise((done) => setTimeout(done, 0));
  });
  expect(document.body.querySelectorAll("a")).toHaveLength(2);
});

it("keeps the current session usable when the saved list fails and recovers on focus", async () => {
  listResponse = async () => Response.json({ error: "Unavailable" }, { status: 503 });
  probe = await renderWithProbe(<TestApp />);
  expect(document.body.querySelector('[role="alert"]')?.textContent).toContain("Could not load");
  expect(document.body.querySelector("a")?.getAttribute("href")).toBe("/browser/testsession");
  listResponse = async () => Response.json(ids);
  await probe.measure(async () => {
    window.dispatchEvent(new Event("focus"));
    await new Promise((done) => setTimeout(done, 0));
  });
  expect(document.body.querySelector('[role="alert"]')).toBeNull();
  expect(document.body.querySelectorAll("a")).toHaveLength(3);
});

// Completing the list request displays new names, so one SessionPanel render is necessary.
it("budgets the render when saved session names arrive", async () => {
  let resolve!: (response: Response) => void;
  listResponse = () =>
    new Promise<Response>((done) => {
      resolve = done;
    });
  probe = await renderWithProbe(<TestApp />);
  expect(document.body.textContent).toContain("Loading saved sessions");
  const report = await probe.measure(() => resolve(Response.json(ids)));
  expect(report.pick("SessionPanel")).toMatchInlineSnapshot(`
    {
      "SessionPanel": 1,
    }
  `);
});

it("does not restore a deleted session when an older list response arrives", async () => {
  probe = await renderWithProbe(<TestApp />);
  let resolve!: (response: Response) => void;
  listResponse = () =>
    new Promise<Response>((done) => {
      resolve = done;
    });
  await probe.measure(async () => {
    window.dispatchEvent(new Event("focus"));
    await new Promise((done) => setTimeout(done, 0));
  });
  await probe.measure(() =>
    document.querySelector<HTMLButtonElement>('[aria-label="Delete session niship"]')!.click(),
  );
  await probe.measure(() => resolve(Response.json(["local", "niship", "testsession"])));
  expect(document.querySelector('a[href="/browser/niship"]')).toBeNull();
});

it("deletes another session without navigating and never offers deletion for local", async () => {
  probe = await renderWithProbe(<TestApp />);
  expect(document.querySelector('[aria-label="Delete session local"]')).toBeNull();
  // One render disables controls while deleting; one removes the deleted session.
  const report = await probe.measure(() =>
    document.querySelector<HTMLButtonElement>('[aria-label="Delete session niship"]')!.click(),
  );
  expect(report.why("SessionPanel")).toEqual([
    expect.objectContaining({ renders: 2, because: ["state"] }),
  ]);
  expect(report.pick("SessionPanel")).toMatchInlineSnapshot(`
    {
      "SessionPanel": 2,
    }
  `);
  expect(document.querySelector('a[href="/browser/niship"]')).toBeNull();
  expect(document.querySelector("output")?.textContent).toBe("testsession");
  expect(ids).toEqual(["local", "testsession"]);
});

it("deletes the current session and opens local in fresh stores", async () => {
  probe = await renderWithProbe(<TestApp />);
  const original = session;
  await probe.measure(() =>
    document.querySelector<HTMLButtonElement>('[aria-label="Delete session testsession"]')!.click(),
  );
  expect(document.querySelector("output")?.textContent).toBe("local");
  expect(session).not.toBe(original);
  expect(document.querySelector('a[href="/browser/testsession"]')).toBeNull();
  expect(document.querySelector('[aria-current="page"]')?.getAttribute("href")).toBe(
    "/browser/local",
  );
});

it("waits for an in-flight autosave before deleting the active session", async () => {
  probe = await renderWithProbe(<TestApp />);
  vi.useFakeTimers();
  let completeSave!: (response: Response) => void;
  const events: string[] = [];
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
    if (init?.method === "PUT") {
      events.push("save");
      return new Promise<Response>((resolve) => {
        completeSave = resolve;
      });
    }
    if (init?.method === "DELETE") {
      events.push("delete");
      return deleteResponse(url);
    }
    if (url === "/api/sessions") return listResponse();
    return Promise.resolve(Response.json(snapshot(session)));
  });
  await probe.measure(() =>
    session.useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 1, end: 100 }),
  );
  await act(async () => vi.advanceTimersByTimeAsync(200));
  expect(events).toEqual(["save"]);
  // A newer edit while the first write is pending must not hide that outstanding write.
  await probe.measure(() =>
    session.useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 200, end: 300 }),
  );
  await act(async () => vi.advanceTimersByTimeAsync(200));
  await probe.measure(() =>
    document.querySelector<HTMLButtonElement>('[aria-label="Delete session testsession"]')!.click(),
  );
  expect(events).toEqual(["save"]);
  await probe.measure(() => completeSave(Response.json({ ok: true })));
  expect(events).toEqual(["save", "delete"]);
  expect(document.querySelector("output")?.textContent).toBe("local");
  await act(async () => vi.advanceTimersByTimeAsync(2000));
  expect(events).toEqual(["save", "delete"]);
});

it("keeps the active session and resumes autosave after deletion fails", async () => {
  probe = await renderWithProbe(<TestApp />);
  vi.useFakeTimers();
  const saves: string[] = [];
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
    if (init?.method === "DELETE") return Promise.resolve(new Response(null, { status: 503 }));
    if (init?.method === "PUT") {
      saves.push(url);
      return Promise.resolve(Response.json({ ok: true }));
    }
    return listResponse();
  });
  await probe.measure(() =>
    document.querySelector<HTMLButtonElement>('[aria-label="Delete session testsession"]')!.click(),
  );
  expect(document.querySelector("output")?.textContent).toBe("testsession");
  expect(document.querySelector('[role="alert"]')?.textContent).toContain(
    "Could not delete testsession",
  );
  await probe.measure(() =>
    session.useBrowserStore.getState().setRegion({ chromosome: "chr2", start: 100, end: 200 }),
  );
  await act(async () => vi.advanceTimersByTimeAsync(200));
  expect(saves).toEqual(["/api/sessions/testsession"]);
});

// Reopening through the workspace store refreshes external additions and removals without remounting.
it("refreshes saved sessions when the mounted Sessions panel reopens", async () => {
  const readList = vi.fn(async () => Response.json(ids));
  listResponse = readList;
  probe = await renderWithProbe(<TestApp />);
  const list = document.querySelector('[aria-label="Browser sessions"]');
  const initialReads = readList.mock.calls.length;
  await probe.measure(() => togglePanel("left"));
  ids = ["local", "newsession", "testsession"];
  expect(readList).toHaveBeenCalledTimes(initialReads);
  const report = await probe.measure(() => togglePanel("left"));
  expect(report.why("SessionPanel")).toEqual([
    expect.objectContaining({ renders: 2, because: ["state"] }),
  ]);
  expect(readList).toHaveBeenCalledTimes(initialReads + 1);
  expect(document.querySelector('[aria-label="Browser sessions"]')).toBe(list);
  expect(document.querySelector('a[href="/browser/niship"]')).toBeNull();
  expect(document.querySelector('a[href="/browser/newsession"]')).not.toBeNull();
  // One render observes reopening; one displays the refreshed names.
  expect(report.pick("SessionPanel")).toMatchInlineSnapshot(`
    {
      "SessionPanel": 2,
    }
  `);
});

it.each(["queued", "in-flight"])(
  "saves %s edits before switching sessions and restores them on return",
  async (phase) => {
    probe = await renderWithProbe(<TestApp />);
    vi.useFakeTimers();
    const originalFetch = fetch;
    const writes: { body: string; resolve: (response: Response) => void }[] = [];
    let saved: string | undefined;
    vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
      if (url === "/api/sessions/testsession" && init?.method === "PUT") {
        return new Promise<Response>((resolve) => {
          writes.push({
            body: init.body as string,
            resolve: (response) => {
              if (response.ok) saved = init.body as string;
              resolve(response);
            },
          });
        });
      }
      if (url === "/api/sessions/testsession" && !init?.method && saved) {
        return Promise.resolve(
          new Response(saved, { headers: { "Content-Type": "application/json" } }),
        );
      }
      return originalFetch(url, init);
    });
    const originalSession = session;
    const edited = { chromosome: "chr1", start: 100, end: 200 };
    await probe.measure(() => session.useBrowserStore.getState().setRegion(edited));
    if (phase === "in-flight") await act(async () => vi.advanceTimersByTimeAsync(200));
    const report = await probe.measure(() =>
      document.querySelector<HTMLAnchorElement>('a[href="/browser/niship"]')!.click(),
    );
    // One render disables navigation while the save is pending.
    expect(report.pick("SessionPanel")).toMatchInlineSnapshot(`
      {
        "SessionPanel": 1,
      }
    `);
    expect(writes).toHaveLength(1);
    expect(document.querySelector("output")?.textContent).toBe("testsession");
    expect(session).toBe(originalSession);
    // An edit arriving during the outstanding PUT must get its own acknowledgement.
    const newer = { chromosome: "chr1", start: 300, end: 400 };
    await probe.measure(() => session.useBrowserStore.getState().setRegion(newer));
    await probe.measure(() => writes[0].resolve(Response.json({ ok: true })));
    expect(writes).toHaveLength(2);
    expect(session).toBe(originalSession);
    await probe.measure(() => writes[1].resolve(Response.json({ ok: true })));
    expect(document.querySelector("output")?.textContent).toBe("niship");
    expect(JSON.parse(saved!).browser.region).toEqual(newer);
    await probe.measure(() =>
      document.querySelector<HTMLAnchorElement>('a[href="/browser/testsession"]')!.click(),
    );
    expect(document.querySelector("output")?.textContent).toBe("testsession");
    expect(session.useBrowserStore.getState().region).toEqual(newer);
  },
);

it.each(["queued", "in-flight"])(
  "keeps the current session and edits when a %s save fails during switching",
  async (phase) => {
    probe = await renderWithProbe(<TestApp />);
    vi.useFakeTimers();
    const originalFetch = fetch;
    let complete!: (response: Response) => void;
    vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
      init?.method === "PUT"
        ? new Promise<Response>((resolve) => {
            complete = resolve;
          })
        : originalFetch(url, init),
    );
    const originalSession = session;
    const edited = { chromosome: "chr1", start: 100, end: 200 };
    await probe.measure(() => session.useBrowserStore.getState().setRegion(edited));
    if (phase === "in-flight") await act(async () => vi.advanceTimersByTimeAsync(200));
    await probe.measure(() =>
      document.querySelector<HTMLAnchorElement>('a[href="/browser/niship"]')!.click(),
    );
    await probe.measure(() => complete(Response.json({}, { status: 503 })));
    expect(document.querySelector("output")?.textContent).toBe("testsession");
    expect(session).toBe(originalSession);
    expect(session.useBrowserStore.getState().region).toEqual(edited);
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("Could not save");
    // A second selection retries saving instead of discarding the unsaved edit.
    await probe.measure(() =>
      document.querySelector<HTMLAnchorElement>('a[href="/browser/niship"]')!.click(),
    );
    await probe.measure(() => complete(Response.json({ ok: true })));
    expect(document.querySelector("output")?.textContent).toBe("niship");
  },
);

it("does not override Settings navigation when a pending session-selection save completes", async () => {
  probe = await renderWithProbe(<TestApp />);
  vi.useFakeTimers();
  const originalFetch = fetch;
  let complete!: (response: Response) => void;
  let savedBody = "";
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
    init?.method === "PUT"
      ? new Promise<Response>((resolve) => {
          savedBody = init.body as string;
          complete = resolve;
        })
      : originalFetch(url, init),
  );
  const originalSession = session;
  const edited = { chromosome: "chr1", start: 100, end: 200 };
  await probe.measure(() => session.useBrowserStore.getState().setRegion(edited));
  await probe.measure(() =>
    document.querySelector<HTMLAnchorElement>('a[href="/browser/niship"]')!.click(),
  );
  await probe.measure(() => route.navigate("/settings"));
  expect(document.querySelector('[aria-label="Browser sessions"]')).toBeNull();
  expect(document.querySelector("main")?.textContent).toBe("Settings");
  await probe.measure(() => complete(Response.json({ ok: true })));
  expect(document.querySelector("main")?.textContent).toBe("Settings");
  expect(document.querySelector('[aria-label="Browser sessions"]')).toBeNull();
  expect(session).toBe(originalSession);
  expect(JSON.parse(savedBody).browser.region).toEqual(edited);
});

it.each(["unsupported track", "failed GET"])(
  "can leave a session with a %s without overwriting its saved snapshot",
  async (failure) => {
    const originalFetch = fetch;
    const writes: string[] = [];
    let brokenSnapshot: ReturnType<typeof snapshot> | undefined;
    vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
      if (init?.method === "PUT") writes.push(url);
      if (url === "/api/sessions/testsession" && !init?.method) {
        if (failure === "failed GET") return Promise.resolve(Response.json({}, { status: 503 }));
        brokenSnapshot ??= snapshot(session);
        brokenSnapshot.tracks[0].type = "unregistered-track";
        return Promise.resolve(Response.json(brokenSnapshot));
      }
      return originalFetch(url, init);
    });
    probe = await renderWithProbe(<TestApp />);
    expect(document.querySelector('[data-testid="save-state"]')?.textContent).toBe("load-error");
    const originalSnapshot = JSON.stringify(brokenSnapshot);
    await probe.measure(() =>
      document.querySelector<HTMLAnchorElement>('a[href="/browser/niship"]')!.click(),
    );
    expect(document.querySelector("output")?.textContent).toBe("niship");
    expect(document.querySelector('[data-testid="save-state"]')?.textContent).toBe("saved");
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(session.useBrowserStore.getState().region).toEqual({
      chromosome: "chr12",
      start: 10000,
      end: 20000,
    });
    expect(writes).toEqual([]);
    expect(JSON.stringify(brokenSnapshot)).toBe(originalSnapshot);
    await probe.measure(() =>
      document.querySelector<HTMLAnchorElement>('a[href="/browser/testsession"]')!.click(),
    );
    expect(document.querySelector("output")?.textContent).toBe("testsession");
    expect(document.querySelector('[data-testid="save-state"]')?.textContent).toBe("load-error");
    expect(writes).toEqual([]);
  },
);
