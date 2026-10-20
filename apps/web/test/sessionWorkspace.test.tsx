// @vitest-environment jsdom

// Import first: it mocks the Next.js router before the app's modules load.
import { route, stubLayout, WorkspaceApp } from "./workspaceApp";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { act } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createStores } from "../features/assemblies/assemblies";
import { useRemoteControl } from "../features/agent/RemoteControl";
import { snapshot } from "../features/sessions/storeSnapshot";
import { installSessionServer, type SessionServer } from "./sessionServer";

// The workspace composition, session owner, autosave, panels, and browser are real.
// Next routing and `fetch` are replaced; see workspaceApp.tsx and sessionServer.ts.
// Clerk's hooks report a signed-in user whose sign-out the tests observe.
const clerk = vi.hoisted(() => ({
  signOut: vi.fn<() => Promise<void>>(async () => {}),
  openUserProfile: vi.fn<() => void>(),
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, userId: "user_alice" }),
  useClerk: () => clerk,
  UserAvatar: () => null,
}));

let server: SessionServer;
let probe: Probe | undefined;

const defaults = () => snapshot(createStores("hg38")!);
const text = () => document.body.textContent ?? "";
const heading = () => document.querySelector("h1")?.textContent;
const region = () =>
  document.querySelector('[aria-label^="Edit region"]')?.getAttribute("aria-label");
const sessionLoads = () => server.requests.filter(({ method, id }) => method === "GET" && id);
const sessionNames = () =>
  [...document.querySelectorAll('[aria-label="Browser sessions"] a')].map((a) => a.textContent);
function click(element: Element | null | undefined) {
  if (!element) throw new Error("Nothing to click");
  return act(async () => (element as HTMLElement).click());
}
const link = (name: string) =>
  [...document.querySelectorAll<HTMLAnchorElement>("a")].find((a) => a.textContent === name);
const button = (label: string) =>
  document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
const withText = (selector: string, content: string) =>
  [...document.querySelectorAll(selector)].find((element) => element.textContent === content);
const mockUser = () => /gb_mock_user=([^;]+)/.exec(document.cookie)?.[1];
const savedRegion = (id: string) => server.stored.get(id)!.snapshot.browser.region;
const pendingPut = () => vi.waitFor(() => expect(server.requests.at(-1)?.method).toBe("PUT"));
function closeTab() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}
async function actAs(user: string) {
  await click(button("Mock user"));
  await click(withText('[role="menuitem"]', user));
}

async function visit(pathname: string) {
  route.reset(pathname);
  probe = await renderWithProbe(<WorkspaceApp />);
}

beforeEach(() => {
  server = installSessionServer();
  stubLayout();
  document.cookie = "gb_mock_user=; max-age=0; path=/";
  clerk.signOut.mockClear();
  clerk.openUserProfile.mockClear();
});

afterEach(() => {
  probe?.unmount();
  probe = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("creates a session, saves edits, and keeps it open across workspace pages", async () => {
  const errors = vi.spyOn(console, "error");
  await visit("/browser");
  await vi.waitFor(() => expect(text()).toContain("No saved sessions yet."));
  expect(text()).toContain("Open a saved session or create one in the Sessions panel.");

  const input = document.querySelector<HTMLInputElement>('form[aria-label="New session"] input')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
      input,
      "Promoter scan",
    );
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () =>
    document.querySelector<HTMLFormElement>('form[aria-label="New session"]')!.requestSubmit(),
  );
  await vi.waitFor(() => expect(heading()).toBe("Promoter scan"));
  const [id] = server.stored.keys();
  expect(route.pathname()).toBe(`/browser/${id}`);
  expect(sessionNames()).toEqual(["Promoter scan"]);

  const before = region();
  await click(button("Pan right"));
  expect(region()).not.toBe(before);
  await vi.waitFor(() => expect(closeTab()).toBe(false));
  expect(server.stored.get(id)!.snapshot.browser.region).not.toEqual(defaults().browser.region);

  const edited = region();
  await click(document.querySelector('nav a[aria-label="Settings"]'));
  expect(route.pathname()).toBe("/settings");
  await click(document.querySelector('nav a[aria-label="Browser"]'));
  await vi.waitFor(() => expect(route.pathname()).toBe(`/browser/${id}`));
  expect(region()).toBe(edited);
  expect(sessionLoads()).toEqual([]);
  // Panel children that reset per session must not share a key.
  expect(errors.mock.calls.flat().join("\n")).not.toContain("same key");
});

it("opens the session in the URL, from links, and from history", async () => {
  const a = server.add("Alpha", defaults());
  const b = server.add("Beta", {
    ...defaults(),
    browser: { ...defaults().browser, region: { chromosome: "chr2", start: 1000, end: 2000 } },
  });
  await visit(`/browser/${a}`);
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));
  expect(sessionNames()).toEqual(["Alpha", "Beta"]);

  await click(link("Beta"));
  await vi.waitFor(() => expect(heading()).toBe("Beta"));
  expect(region()).toBe("Edit region chr2:1,001-2,000");
  expect(route.pathname()).toBe(`/browser/${b}`);

  await act(async () => route.back());
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));
  expect(route.pathname()).toBe(`/browser/${a}`);
});

it("returns to the open session when another cannot be opened", async () => {
  const a = server.add("Alpha", defaults());
  await visit(`/browser/${a}`);
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));

  await act(async () => route.push(`/browser/${crypto.randomUUID()}`));
  await vi.waitFor(() => expect(route.pathname()).toBe(`/browser/${a}`));
  expect(heading()).toBe("Alpha");
  expect(document.querySelector('[role="alert"]')?.textContent).toBe(
    "This session was not found. It may have been deleted.",
  );
});

it("offers to retry a session URL that could not be opened", async () => {
  const id = server.add("Alpha", defaults());
  await visit("/browser");
  await vi.waitFor(() => expect(sessionNames()).toEqual(["Alpha"]));
  for (let attempt = 0; attempt < 3; attempt++) server.fail("GET");
  await act(async () => route.push(`/browser/${id}`));
  await vi.waitFor(() => expect(text()).toContain("Try again"), { timeout: 3000 });
  expect(route.pathname()).toBe(`/browser/${id}`);
  expect(heading()).toBeFalsy();
  expect(server.writes()).toEqual([]);

  await click([...document.querySelectorAll("button")].find((b) => b.textContent === "Try again"));
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));
});

it("deletes the open session and shows the empty browser", async () => {
  const a = server.add("Alpha", defaults());
  server.add("Beta", defaults());
  await visit(`/browser/${a}`);
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));

  await click(button("Delete session Alpha"));
  await vi.waitFor(() => expect(route.pathname()).toBe("/browser"));
  expect(text()).toContain("Open a saved session or create one in the Sessions panel.");
  expect(sessionNames()).toEqual(["Beta"]);
  expect(server.stored.has(a)).toBe(false);
});

it("saves the open session's edits before switching users", async () => {
  const a = server.add("Alpha", defaults());
  await visit(`/browser/${a}`);
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));
  const write = server.hold("PUT");
  await click(button("Pan right"));
  await actAs("user_bob");
  await pendingPut();
  expect(mockUser()).toBeUndefined();

  await act(async () => write.release());
  await vi.waitFor(() => expect(mockUser()).toBe("user_bob"));
  expect(savedRegion(a)).not.toEqual(defaults().browser.region);
  // jsdom does not reload, but the reload would have nothing to ask about.
  expect(closeTab()).toBe(false);
});

it("switches users only after unsaved edits are saved or discarded", async () => {
  const a = server.add("Alpha", defaults());
  await visit(`/browser/${a}`);
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));
  const first = server.hold("PUT");
  await click(button("Pan right"));
  const edited = region();
  await actAs("user_bob");
  await pendingPut();
  await act(async () => first.fail());
  await vi.waitFor(() => expect(text()).toContain("Changes not saved"));
  expect(mockUser()).toBeUndefined();

  await click(withText('[role="dialog"] button', "Stay"));
  await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
  expect(heading()).toBe("Alpha");
  expect(region()).toBe(edited);
  expect(mockUser()).toBeUndefined();
  expect(closeTab()).toBe(true);

  const second = server.hold("PUT");
  await actAs("user_bob");
  await vi.waitFor(() => expect(server.writes()).toHaveLength(2));
  await act(async () => second.fail());
  await vi.waitFor(() => expect(text()).toContain("Changes not saved"));
  expect(mockUser()).toBeUndefined();
  await click(withText('[role="dialog"] button', "Discard changes"));
  await vi.waitFor(() => expect(mockUser()).toBe("user_bob"));
  expect(closeTab()).toBe(false);
  expect(server.writes()).toHaveLength(2);
  expect(savedRegion(a)).toEqual(defaults().browser.region);
});

it.each(["Sign out", "Manage account"])("saves before Clerk %s", async (action) => {
  const change = action === "Sign out" ? clerk.signOut : clerk.openUserProfile;
  const a = server.add("Alpha", defaults());
  route.reset(`/browser/${a}`);
  probe = await renderWithProbe(
    <WorkspaceApp account={{ mode: "clerk", signInPath: "/sign-in" }} />,
  );
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));
  const write = server.hold("PUT");
  await click(button("Pan right"));
  await click(button("Account"));
  await click(withText('[role="menuitem"]', action));
  await pendingPut();
  expect(change).not.toHaveBeenCalled();

  await act(async () => write.release());
  await vi.waitFor(() => expect(change).toHaveBeenCalledOnce());
  expect(savedRegion(a)).not.toEqual(defaults().browser.region);
  expect(route.pathname()).toBe("/browser");
});

it("keeps account management closed until failed edits are explicitly discarded", async () => {
  const a = server.add("Alpha", defaults());
  route.reset(`/browser/${a}`);
  probe = await renderWithProbe(
    <WorkspaceApp account={{ mode: "clerk", signInPath: "/sign-in" }} />,
  );
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));
  const write = server.hold("PUT");
  await click(button("Pan right"));
  await click(button("Account"));
  await click(withText('[role="menuitem"]', "Manage account"));
  await pendingPut();
  await act(async () => write.fail());
  await vi.waitFor(() => expect(text()).toContain("Changes not saved"));
  expect(clerk.openUserProfile).not.toHaveBeenCalled();
  expect(closeTab()).toBe(true);
  await click(withText('[role="dialog"] button', "Discard changes"));
  await vi.waitFor(() => expect(clerk.openUserProfile).toHaveBeenCalledOnce());
  expect(closeTab()).toBe(false);
  expect(savedRegion(a)).toEqual(defaults().browser.region);
});

it("offers to close a session deleted elsewhere without saving its edits", async () => {
  const a = server.add("Alpha", defaults());
  await visit(`/browser/${a}`);
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));
  server.stored.delete(a);
  await click(button("Pan right"));
  await vi.waitFor(() =>
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(
      "This session was deleted elsewhere. Its changes cannot be saved.",
    ),
  );
  expect(closeTab()).toBe(true);
  await click(withText("button", "Close without saving"));
  await vi.waitFor(() => expect(route.pathname()).toBe("/browser"));
  expect(closeTab()).toBe(false);
});

it("asks a signed-out user to sign in", async () => {
  server.user = null;
  await visit("/browser");
  await vi.waitFor(() => expect(text()).toContain("Sign in to open and save sessions."));
  expect(text()).toContain("Sign in to save sessions.");
  expect(document.querySelector('form[aria-label="New session"]')).toBeNull();
});

// Session panel subscriptions: a region edit changes neither the session list nor the
// selection. Acknowledgements only change timestamps, which the panel does not
// display. BrowserView and BrowserContent show the same stores.
it("budgets session readers for an edit and its save acknowledgement", async () => {
  const id = server.add("Alpha", defaults());
  await visit(`/browser/${id}`);
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));
  const write = server.hold("PUT");

  const edit = await probe!.measure(async () => {
    const pan = button("Pan right")!;
    pan.click();
    await vi.waitFor(() => expect(server.requests.at(-1)?.method).toBe("PUT"));
  });
  expect(edit.pick("SessionPanel", "SessionName", "BrowserView")).toMatchInlineSnapshot(`
    {
      "BrowserView": 0,
      "SessionName": 0,
      "SessionPanel": 0,
    }
  `);

  const acknowledgement = await probe!.measure(async () => {
    write.release();
    await vi.waitFor(() => expect(closeTab()).toBe(false));
  });
  expect(acknowledgement.pick("BrowserView", "BrowserContent", "SessionPanel"))
    .toMatchInlineSnapshot(`
    {
      "BrowserContent": 0,
      "BrowserView": 0,
      "SessionPanel": 0,
    }
  `);
});

// The saved names arrive once; the panel renders once to show them.
it("budgets the session panel when saved sessions arrive", async () => {
  server.add("Alpha", defaults());
  const list = server.hold("GET");
  await visit("/browser");
  const report = await probe!.measure(async () => {
    list.release();
    await vi.waitFor(() => expect(sessionNames()).toEqual(["Alpha"]));
  });
  expect(report.pick("SessionPanel")).toMatchInlineSnapshot(`
    {
      "SessionPanel": 1,
    }
  `);
});

function RemoteControlReader() {
  return <p>{useRemoteControl().enabled ? "Enabled" : "Disabled"}</p>;
}

// Switching sessions leaves remote control off, so its readers have no new data.
it("budgets remote-control readers when the open session changes", async () => {
  const a = server.add("Alpha", defaults());
  server.add("Beta", defaults());
  route.reset(`/browser/${a}`);
  probe = await renderWithProbe(
    <WorkspaceApp>
      <RemoteControlReader />
    </WorkspaceApp>,
  );
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));
  const report = await probe.measure(async () => {
    link("Beta")!.click();
    await vi.waitFor(() => expect(heading()).toBe("Beta"));
  });
  expect(report.pick("RemoteControlReader")).toMatchInlineSnapshot(`
    {
      "RemoteControlReader": 0,
    }
  `);
});

// Deleting another session updates row controls; the panel renders once to remove its ID.
it("budgets the session panel when another session is deleted", async () => {
  const a = server.add("Alpha", defaults());
  server.add("Beta", defaults());
  await visit(`/browser/${a}`);
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));
  const report = await probe!.measure(async () => {
    button("Delete session Beta")!.click();
    await vi.waitFor(() => expect(sessionNames()).toEqual(["Alpha"]));
  });
  expect(report.pick("SessionPanel", "BrowserView", "BrowserContent")).toMatchInlineSnapshot(`
    {
      "BrowserContent": 0,
      "BrowserView": 0,
      "SessionPanel": 1,
    }
  `);
});

// The new URL mounts its page, still showing the open session; opening then swaps the stores.
// Pending operations update the row controls, without rendering the panel.
it("budgets session readers when the open session changes", async () => {
  const a = server.add("Alpha", defaults());
  server.add("Beta", defaults());
  await visit(`/browser/${a}`);
  await vi.waitFor(() => expect(heading()).toBe("Alpha"));
  const report = await probe!.measure(async () => {
    link("Beta")!.click();
    await vi.waitFor(() => expect(heading()).toBe("Beta"));
  });
  expect(report.pick("SessionPanel", "SessionName", "BrowserView", "BrowserContent"))
    .toMatchInlineSnapshot(`
    {
      "BrowserContent": 2,
      "BrowserView": 2,
      "SessionName": 2,
      "SessionPanel": 2,
    }
  `);
});
