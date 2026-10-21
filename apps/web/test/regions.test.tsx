// @vitest-environment jsdom

// Install Next.js routing mocks before loading the app.
import { route, stubLayout, WorkspaceApp } from "./workspaceApp";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { act, type ReactNode } from "react";
import type { GenomeBrowserStores } from "@weng-lab/genomebrowser";
import { useSession } from "../features/sessions/SessionProvider";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createStores } from "../features/assemblies/assemblies";
import { snapshot } from "../features/sessions/storeSnapshot";
import { installSessionServer, type SessionServer } from "./sessionServer";

let probe: Probe | undefined;
let server: SessionServer;
const defaults = () => snapshot(createStores("hg38")!);
const text = () => document.body.textContent ?? "";
const button = (label: string) => document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
const withText = (selector: string, label: string) =>
  [...document.querySelectorAll<HTMLElement>(selector)].find(
    (element) => element.textContent === label,
  );
const click = (element: HTMLElement | null | undefined) => {
  if (!element) throw new Error("Missing control");
  return act(async () => element.click());
};
function input(label: string) {
  const element = [...document.querySelectorAll("label")].find((element) =>
    element.textContent?.startsWith(label),
  );
  return document.getElementById(element!.htmlFor) as HTMLInputElement;
}
async function type(label: string, value: string) {
  await act(async () => {
    const element = input(label);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function visit(id?: string, children?: ReactNode) {
  route.reset(id ? `/browser/${id}` : "/browser");
  probe = await renderWithProbe(<WorkspaceApp>{children}</WorkspaceApp>);
  if (id)
    await vi.waitFor(() =>
      expect(document.querySelector("h1")?.textContent).toBe(server.stored.get(id)!.name),
    );
  await click(withText('[role="tab"]', "Regions"));
}

beforeEach(() => {
  server = installSessionServer();
  stubLayout();
});
afterEach(() => {
  probe?.unmount();
  probe = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("saves the viewport, hides and edits its highlight, navigates, and restores it per session", async () => {
  const initial = defaults();
  const a = server.add("Alpha", initial);
  const b = server.add("Beta", defaults());
  await visit(a);
  await click(button("Save current region"));
  await vi.waitFor(() => expect(server.stored.get(a)!.snapshot.browser.highlights).toHaveLength(1));
  const saved = server.stored.get(a)!.snapshot.browser.highlights[0];
  expect(saved.region).toEqual(initial.browser.region);
  expect(document.querySelector(`[aria-label="Show highlight for ${saved.id}"]`)).not.toBeNull();
  const color = saved.color;
  const overlay = () => document.querySelector(`main svg rect[fill="${color}"]`);
  expect(overlay()).not.toBeNull();
  await click(button(`Show highlight for ${saved.id}`));
  expect(overlay()).toBeNull();
  await vi.waitFor(() =>
    expect(server.stored.get(a)!.snapshot.browser.highlights[0].visible).toBe(false),
  );

  await click(button(`Actions for ${saved.id}`));
  await click(withText('[role="menuitem"]', "Edit region"));
  await type("ID", "Promoter");
  await type("Region", "chr2:1,001-2,000");
  await click(withText("button", "Save changes"));
  await click(button("Close highlights"));
  await vi.waitFor(() =>
    expect(server.stored.get(a)!.snapshot.browser.highlights[0]).toMatchObject({
      id: "Promoter",
      visible: false,
      region: { chromosome: "chr2", start: 1000, end: 2000 },
    }),
  );

  await click(button("Filter regions"));
  await type("Filter regions", "missing");
  expect(text()).toContain("No matching regions.");
  await type("Filter regions", "chr2");
  expect(text()).toContain("Promoter");
  await click(button("Filter regions"));
  expect(button("Filter regions")?.getAttribute("aria-expanded")).toBe("false");
  expect(
    [...document.querySelectorAll("label")].some((label) => label.textContent === "Filter regions"),
  ).toBe(false);
  await click(withText('[aria-label="Saved regions"] [role="button"]', "Promoterchr2:1,001-2,000"));
  expect(document.querySelector('[aria-label="Edit region chr2:1,001-2,000"]')).not.toBeNull();
  await click(button("Show highlight for Promoter"));
  expect(overlay()).not.toBeNull();

  // Switching saves all edits and restores only the next session's regions.
  await act(async () => route.push(`/browser/${b}`));
  await vi.waitFor(() => expect(document.querySelector("h1")?.textContent).toBe("Beta"));
  await click(withText('[role="tab"]', "Regions"));
  expect(button("Show highlight for Promoter")).toBeNull();
  await act(async () => route.push(`/browser/${a}`));
  await vi.waitFor(() => expect(document.querySelector("h1")?.textContent).toBe("Alpha"));
  await click(withText('[role="tab"]', "Regions"));
  expect((button("Show highlight for Promoter") as HTMLInputElement).checked).toBe(true);
  probe!.unmount();
  probe = undefined;
  await visit(a);
  expect(button("Show highlight for Promoter")).not.toBeNull();
  await click(button("Actions for Promoter"));
  await click(withText('[role="menuitem"]', "Delete region"));
  await vi.waitFor(() => expect(server.stored.get(a)!.snapshot.browser.highlights).toEqual([]));
});

it("shows an empty state without a session and includes existing highlights in creation order", async () => {
  await visit();
  expect(text()).toContain("Open a session to save regions.");
  expect(button("Save current region")).toBeNull();
  probe!.unmount();
  probe = undefined;
  const saved = defaults();
  saved.browser.highlights = [
    { id: "First", region: { chromosome: "chr1", start: 100, end: 200 }, color: "#112233" },
    {
      id: "Second",
      region: { chromosome: "chr2", start: 1000, end: 2000 },
      color: "#223344",
      visible: false,
    },
  ];
  await visit(server.add("Existing", saved));
  expect(
    [...document.querySelectorAll('[aria-label="Saved regions"] input')].map((element) =>
      element.getAttribute("aria-label"),
    ),
  ).toEqual(["Show highlight for First", "Show highlight for Second"]);
  await click(button("Save current region"));
  await click(button("Save current region"));
  const checks = document.querySelectorAll('[aria-label="Saved regions"] input');
  expect(checks).toHaveLength(4);
  expect(checks[3].getAttribute("aria-label")).toContain("(2)");
});

// Toggle an existing highlight through its checkbox. Only its row and the two
// browser overlays show changed data; the list and sibling row stay still.
// Core overlay budgets are measured against source in the core render suite.
it("budgets renders when toggling one saved region", async () => {
  const saved = defaults();
  saved.browser.highlights = ["First", "Second"].map((id) => ({
    id,
    region: saved.browser.region,
    color: "#123456",
  }));
  await visit(server.add("Render budget", saved));
  const report = await probe!.measure(() => button("Show highlight for First")!.click());
  expect(report.pick("SavedRegions", "RegionRow", "BrowserContent")).toMatchInlineSnapshot(`
    {
      "BrowserContent": 0,
      "RegionRow": 1,
      "SavedRegions": 0,
    }
  `);
});

it("excludes temporary hover feedback from saved regions and snapshots", async () => {
  let stores: GenomeBrowserStores | undefined;
  function ObserveSession() {
    stores = useSession((session) => session.active?.stores);
    return null;
  }
  await visit(server.add("Temporary feedback", defaults()), <ObserveSession />);
  await probe!.measure(() =>
    stores!.useBrowserStore.getState().addHighlight({
      id: "hover",
      region: stores!.useBrowserStore.getState().region,
      color: "#123456",
      transient: true,
    }),
  );
  expect(stores!.useBrowserStore.getState().highlights).toHaveLength(1);
  expect(button("Show highlight for hover")).toBeNull();
  expect(snapshot(stores!).browser.highlights).toEqual([]);
  expect(server.writes()).toEqual([]);
  await probe!.measure(() =>
    stores!.useBrowserStore.getState().addHighlight({
      id: "Persistent",
      region: stores!.useBrowserStore.getState().region,
      color: "#123456",
      transient: false,
    }),
  );
  const saved = snapshot(stores!).browser.highlights;
  expect(saved.map(({ id }) => id)).toEqual(["Persistent"]);
  expect(saved[0]).not.toHaveProperty("transient");
  expect(button("Show highlight for Persistent")).not.toBeNull();
});

// Navigate between two saved regions. This records which rows must update
// when the viewport moves; the list itself has the same entries throughout.
it("budgets region-card renders when navigating between saved regions", async () => {
  const saved = defaults();
  saved.browser.region = { chromosome: "chr1", start: 1000, end: 2000 };
  saved.browser.highlights = [
    { id: "Alpha", region: saved.browser.region, color: "#007acc" },
    { id: "Beta", region: { chromosome: "chr1", start: 3000, end: 4000 }, color: "#ffd580" },
  ];
  await visit(server.add("Card navigation", saved));
  const report = await probe!.measure(() =>
    withText('[aria-label="Saved regions"] [role="button"]', "Betachr1:3,001-4,000")!.click(),
  );
  expect(
    withText('[aria-label="Saved regions"] [role="button"]', "Betachr1:3,001-4,000")?.getAttribute(
      "aria-current",
    ),
  ).toBe("location");
  expect(
    withText('[aria-label="Saved regions"] [role="button"]', "Alphachr1:1,001-2,000")?.hasAttribute(
      "aria-current",
    ),
  ).toBe(false);
  // Necessary: Alpha loses its selected state and Beta gains it. The list and
  // browser controls receive no changed data and do not render.
  expect(report.pick("SavedRegions", "RegionRow", "BrowserContent")).toMatchInlineSnapshot(`
    {
      "BrowserContent": 0,
      "RegionRow": 2,
      "SavedRegions": 0,
    }
  `);
});
