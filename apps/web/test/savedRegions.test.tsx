// @vitest-environment jsdom

// Import first: it mocks the Next.js router before the app's modules load.
import { route, stubLayout, WorkspaceApp } from "./workspaceApp";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createStores } from "../features/assemblies/assemblies";
import { snapshot } from "../features/sessions/storeSnapshot";
import { installSessionServer, type SessionServer } from "./sessionServer";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let server: SessionServer;
let id: string;
const start = { chromosome: "chr11", start: 5_225_000, end: 5_305_000 };

beforeEach(() => {
  server = installSessionServer();
  server.remoteControl.set("user_alice", false);
  const saved = snapshot(createStores("hg38")!);
  id = server.add("Session", { ...saved, browser: { ...saved.browser, region: start } });
  route.reset(`/browser/${id}`);
  stubLayout();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const saved = () => server.stored.get(id)!.snapshot.browser;
const cards = () => [...container!.querySelectorAll('[aria-label="Saved regions"] li')];
const first = "chr11:5,225,001-5,305,000";
const second = `${first} (2)`;
const regionAt = (id: string, name: string, color: string) =>
  ({ id, name, region: start, color, type: "filled" }) as const;

/** Open a session saved with `highlights`, at `start`, and wait for its regions to show. */
async function openWithRegions(...highlights: ReturnType<typeof regionAt>[]) {
  const defaults = snapshot(createStores("hg38")!);
  id = server.add("Regions", {
    ...defaults,
    browser: { ...defaults.browser, region: start, highlights },
  });
  route.reset(`/browser/${id}`);
  await act(async () => root!.render(<WorkspaceApp />));
  await vi.waitFor(() => expect(cards()).toHaveLength(highlights.length));
}

async function click(element: Element | null | undefined) {
  await act(async () => (element as HTMLElement).click());
}

async function type(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function chooseAction(region: string, action: string) {
  await click(document.querySelector(`[aria-label="Actions for region ${region}"]`));
  await click(
    [...document.querySelectorAll('[role="menuitem"]')].find((item) => item.textContent === action),
  );
}

it("edits, hides, visits, and deletes regions, saving them with the session", async () => {
  await openWithRegions(regionAt("r1", first, "#1976d2"));
  expect(cards().map((card) => card.textContent)).toEqual([first + first]);
  expect(cards()[0].querySelector('[aria-current="location"]')).not.toBeNull();
  const regionId = "r1";

  await chooseAction("chr11:5,225,001-5,305,000", "Edit region");
  const field = (label: string) =>
    document.getElementById(
      [...document.querySelectorAll('[role="dialog"] label')]
        .find((element) => element.textContent?.startsWith(label))!
        .getAttribute("for")!,
    ) as HTMLInputElement;
  await type(field("Name"), "HS2");
  await type(field("Region"), "chr11:5,280,601-5,281,000");
  await type(field("Color"), "#ff0000");
  await type(field("Opacity"), "50");
  await act(async () => field("Name").form!.requestSubmit());
  const hs2 = { chromosome: "chr11", start: 5_280_600, end: 5_281_000 };
  expect(cards().map((card) => card.textContent)).toEqual(["HS2chr11:5,280,601-5,281,000"]);
  expect(cards()[0].querySelector('[aria-current="location"]')).toBeNull();
  await vi.waitFor(() =>
    expect(saved().highlights).toEqual([
      { id: regionId, name: "HS2", region: hs2, color: "#ff0000", opacity: 0.5, type: "filled" },
    ]),
  );

  // Hiding keeps the region's own opacity, and showing it again restores it.
  await chooseAction("HS2", "Hide highlight");
  expect(cards()[0].textContent).toContain("Hidden");
  await vi.waitFor(() =>
    expect(saved().highlights).toEqual([
      {
        id: regionId,
        name: "HS2",
        region: hs2,
        color: "#ff0000",
        opacity: 0.5,
        type: "filled",
        hidden: true,
      },
    ]),
  );
  await chooseAction("HS2", "Show highlight");
  expect(cards()[0].textContent).not.toContain("Hidden");
  await vi.waitFor(() =>
    expect(saved().highlights).toEqual([
      { id: regionId, name: "HS2", region: hs2, color: "#ff0000", opacity: 0.5, type: "filled" },
    ]),
  );
  await chooseAction("HS2", "Hide highlight");

  await click(cards()[0].querySelector("[role='button']"));
  expect(cards()[0].querySelector('[aria-current="location"]')).not.toBeNull();
  await vi.waitFor(() => expect(saved().region).toEqual(hs2));

  await chooseAction("HS2", "Delete");
  expect(cards()).toEqual([]);
  expect(container!.textContent).toContain("No regions yet");
  await vi.waitFor(() => expect(saved().highlights).toEqual([]));
});

it("adds the current view as a region, named Region and a number unless named", async () => {
  await act(async () => root!.render(<WorkspaceApp />));
  const add = await vi.waitFor(() => {
    const found = container!.querySelector<HTMLButtonElement>('button[aria-label="Add region"]');
    expect(found).not.toBeNull();
    return found!;
  });
  const form = () => container!.querySelector<HTMLFormElement>('form[aria-label="Add region"]');
  const nameField = () => form()!.querySelector("input")!;
  const names = () => saved().highlights.map((highlight) => highlight.name);

  await click(add);
  expect(add.getAttribute("aria-expanded")).toBe("true");
  expect(nameField().placeholder).toBe("Region 1");
  await click(button(form()!, "Add current region"));
  expect(form()).toBeNull();
  expect(cards().map((card) => card.textContent)).toEqual([`Region 1${first}`]);
  await vi.waitFor(() =>
    expect(saved().highlights).toEqual([
      expect.objectContaining({ name: "Region 1", region: start, type: "filled" }),
    ]),
  );

  await click(add);
  expect(nameField().placeholder).toBe("Region 2");
  await type(nameField(), "HS2");
  await act(async () => form()!.requestSubmit());
  await vi.waitFor(() => expect(names()).toEqual(["Region 1", "HS2"]));

  await click(add);
  expect(nameField().placeholder).toBe("Region 2");
  await click(button(form()!, "Cancel"));
  expect(form()).toBeNull();
  expect(add.getAttribute("aria-expanded")).toBe("false");
  expect(cards()).toHaveLength(2);
});

it("deletes every region after asking", async () => {
  await openWithRegions(regionAt("r1", first, "#1976d2"), regionAt("r2", second, "#f59e0b"));
  await click(button(container!, "Delete all regions"));
  await click(button(document.querySelector('[role="dialog"]')!, "Delete all"));
  expect(cards()).toEqual([]);
  await vi.waitFor(() => expect(saved().highlights).toEqual([]));
});

function button(within: ParentNode, label: string) {
  return [...within.querySelectorAll("button")].find((button) => button.textContent === label);
}

it("groups regions, collapses and edits a group, and saves groups with the session", async () => {
  await openWithRegions(regionAt("r1", first, "#1976d2"), regionAt("r2", second, "#f59e0b"));
  const groups = () => server.stored.get(id)!.snapshot.regionGroups;
  const [firstId, secondId] = ["r1", "r2"];
  const header = () => container!.querySelector('[aria-label="Saved regions"] [aria-expanded]');
  const members = (name: string) =>
    [...container!.querySelectorAll(`[aria-label="${name}"] li`)].map(
      (card) => card.querySelector(".MuiListItemText-primary")?.textContent,
    );
  const dialog = () => document.querySelector('[role="dialog"]')!;
  const nameField = () => dialog().querySelector("input") as HTMLInputElement;

  await chooseAction(first, "Add to new group");
  expect(nameField().value).toBe("Group 1");
  await type(nameField(), "Locus control");
  await click(button(dialog(), "Create group"));
  expect(header()?.getAttribute("aria-expanded")).toBe("true");
  expect(members("Locus control")).toEqual([first]);
  await vi.waitFor(() =>
    expect(groups()).toEqual([
      expect.objectContaining({
        name: "Locus control",
        color: "#1a73e8",
        collapsed: false,
        regionIds: [firstId],
      }),
    ]),
  );

  await chooseAction(second, "Locus control");
  expect(members("Locus control")).toEqual([first, second]);

  await click(header());
  expect(header()?.getAttribute("aria-expanded")).toBe("false");
  expect(header()?.textContent).toContain("· 2");
  expect(container!.querySelector('[aria-label="Locus control"]')).toBeNull();
  await vi.waitFor(() =>
    expect(groups()).toEqual([
      expect.objectContaining({ collapsed: true, regionIds: [firstId, secondId] }),
    ]),
  );
  await click(header());
  expect(members("Locus control")).toEqual([first, second]);

  await click(container!.querySelector('[aria-label="Actions for group Locus control"]'));
  await click(
    [...document.querySelectorAll('[role="menuitem"]')].find(
      (item) => item.textContent === "Edit group",
    ),
  );
  await type(nameField(), "Enhancers");
  await click(dialog().querySelector('[role="radio"][aria-label="Green"]'));
  await click(button(dialog(), "Save"));
  expect(members("Enhancers")).toEqual([first, second]);
  await vi.waitFor(() =>
    expect(groups()).toEqual([expect.objectContaining({ name: "Enhancers", color: "#188038" })]),
  );

  await chooseAction(second, "Remove from Enhancers");
  expect(members("Enhancers")).toEqual([first]);
  await click(container!.querySelector('[aria-label="Actions for group Enhancers"]'));
  await click(
    [...document.querySelectorAll('[role="menuitem"]')].find(
      (item) => item.textContent === "Ungroup",
    ),
  );
  expect(header()).toBeNull();
  expect(cards()).toHaveLength(2);
  await vi.waitFor(() => expect(groups()).toEqual([]));
});

async function chooseGroupAction(group: string, action: string) {
  await click(document.querySelector(`[aria-label="Actions for group ${group}"]`));
  await click(
    [...document.querySelectorAll('[role="menuitem"]')].find((item) => item.textContent === action),
  );
}

it("recolors every highlight in a group, keeping each one's other settings", async () => {
  await openWithRegions(regionAt("r1", first, "#1976d2"), regionAt("r2", second, "#f59e0b"));
  await chooseAction(first, "Add to new group");
  await click(button(document.querySelector('[role="dialog"]')!, "Create group"));
  await chooseAction(second, "Group 1");
  await chooseAction(second, "Hide highlight");
  await vi.waitFor(() => expect(saved().highlights[1]).toMatchObject({ hidden: true }));
  const before = server.stored.get(id)!.snapshot;

  await chooseGroupAction("Group 1", "Change highlight color");
  const input = document.querySelector<HTMLInputElement>('[role="dialog"] input')!;
  // It starts at the group's color. The field writes hex colors in capitals.
  expect(input.value).toBe("#1A73E8");
  await type(input, "#00aa66");
  await act(async () =>
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
  );
  await click(button(document.querySelector('[role="dialog"]')!, "Apply"));

  const recolored = before.browser.highlights.map((highlight) => ({
    ...highlight,
    color: "#00AA66",
  }));
  expect(recolored[1]).toMatchObject({ hidden: true });
  await vi.waitFor(() => expect(saved().highlights).toEqual(recolored));
  expect(server.stored.get(id)!.snapshot.regionGroups).toEqual(before.regionGroups);
  expect(cards()[2].textContent).toContain("Hidden");
});

it("shows regions saved before regions had names by their IDs", async () => {
  const older = snapshot(createStores("hg38")!);
  const region = { chromosome: "chr11", start: 5_280_600, end: 5_281_000 };
  id = server.add("Older session", {
    ...older,
    browser: {
      ...older.browser,
      region: start,
      highlights: [{ id: "HS2", region, color: "#ff0000", type: "filled" }],
    },
  });
  route.reset(`/browser/${id}`);
  await act(async () => root!.render(<WorkspaceApp />));
  await vi.waitFor(() =>
    expect(cards().map((card) => card.textContent)).toEqual(["HS2chr11:5,280,601-5,281,000"]),
  );
});
