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
const groups = () => server.stored.get(id)!.snapshot.regionGroups;
const groupForm = () => container!.querySelector<HTMLFormElement>('form[aria-label="New group"]');
const groupName = () => groupForm()!.querySelector<HTMLInputElement>('[aria-label="Group name"]')!;
const applyColor = () =>
  [...groupForm()!.querySelectorAll("label")]
    .find((label) => label.textContent === "Apply color to all regions")!
    .querySelector("input")!;
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

/** Moves a region to a group, or to a new one, from its menu's Move to group. */
async function moveTo(region: string, group: string) {
  await chooseAction(region, "Move to group");
  await click(
    [
      ...document.querySelectorAll('[role="menu"][aria-label="Move to group"] [role="menuitem"]'),
    ].find((item) => item.textContent === group),
  );
}

async function chooseAction(region: string, action: string) {
  await click(document.querySelector(`[aria-label="Actions for region ${region}"]`));
  await click(
    [...document.querySelectorAll('[role="menuitem"]')].find((item) => item.textContent === action),
  );
}

it("renames, recolors, moves, hides, visits, and deletes regions, saving them", async () => {
  await openWithRegions(regionAt("r1", first, "#1976d2"));
  expect(cards().map((card) => card.textContent)).toEqual([first + first]);
  expect(cards()[0].querySelector('[aria-current="location"]')).not.toBeNull();
  const regionId = "r1";
  const menu = () => document.querySelector('[role="dialog"][aria-label^="Actions for region"]');
  const nameField = () =>
    menu()!.querySelector<HTMLInputElement>('input[aria-label="Region name"]')!;
  const swatch = (name: string) =>
    menu()!.querySelector(`[aria-label="Region color"] [aria-label="${name}"]`);

  // The name and color apply as they change, and the menu starts at the name.
  await click(document.querySelector(`[aria-label="Actions for region ${first}"]`));
  expect(document.activeElement).toBe(nameField());
  await type(nameField(), "HS2");
  expect(cards()[0].textContent).toBe(`HS2${first}`);
  // A blank name keeps the last one.
  await type(nameField(), "");
  expect(cards()[0].textContent).toBe(`HS2${first}`);
  await type(nameField(), "HS2");
  await click(swatch("Red"));
  expect(swatch("Red")!.getAttribute("aria-checked")).toBe("true");
  await click(
    [...menu()!.querySelectorAll('[role="menuitem"]')].find(
      (item) => item.textContent === "Edit coordinates",
    ),
  );
  const coordinates = () => menu()!.querySelector('form[aria-label="Edit coordinates"]')!;
  const positions = () => [...coordinates().querySelectorAll("input")];
  expect(positions().map((input) => input.value)).toEqual(["5,225,001", "5,305,000"]);
  await type(positions()[0], "5,280,601");
  await type(positions()[1], "5,281,000");
  await click(button(coordinates(), "Apply"));
  await vi.waitFor(() => expect(menu()).toBeNull());
  const hs2 = { chromosome: "chr11", start: 5_280_600, end: 5_281_000 };
  expect(cards().map((card) => card.textContent)).toEqual(["HS2chr11:5,280,601-5,281,000"]);
  expect(cards()[0].querySelector('[aria-current="location"]')).toBeNull();
  const shown = { id: regionId, name: "HS2", region: hs2, color: "#c8362b", type: "filled" };
  await vi.waitFor(() => expect(saved().highlights).toEqual([shown]));

  // Hiding keeps the region's color, and showing it again restores it.
  await chooseAction("HS2", "Hide on tracks");
  expect(cards()[0].textContent).toContain("Hidden");
  await vi.waitFor(() => expect(saved().highlights).toEqual([{ ...shown, hidden: true }]));
  await chooseAction("HS2", "Show on tracks");
  expect(cards()[0].textContent).not.toContain("Hidden");
  await vi.waitFor(() => expect(saved().highlights).toEqual([shown]));
  // The dotted swatch hides it as well, and a color shows it.
  await click(document.querySelector('[aria-label="Actions for region HS2"]'));
  await click(swatch("Hidden"));
  await vi.waitFor(() => expect(saved().highlights).toEqual([{ ...shown, hidden: true }]));
  await click(swatch("Blue"));
  await vi.waitFor(() => expect(saved().highlights).toEqual([{ ...shown, color: "#1f6fe5" }]));
  await act(async () =>
    nameField().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
  );
  await vi.waitFor(() => expect(menu()).toBeNull());
  await chooseAction("HS2", "Hide on tracks");

  await click(cards()[0].querySelector("[role='button']"));
  expect(cards()[0].querySelector('[aria-current="location"]')).not.toBeNull();

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
      expect.objectContaining({
        name: "Region 1",
        region: start,
        color: "#1f6fe5",
        type: "filled",
      }),
    ]),
  );
  // Its color is one its menu offers, shown chosen there.
  await click(container!.querySelector('[aria-label="Actions for region Region 1"]'));
  const checked = document.querySelector('[aria-label="Region color"] [aria-checked="true"]');
  expect(checked?.getAttribute("aria-label")).toBe("Blue");
  await act(async () =>
    checked!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
  );
  await vi.waitFor(() =>
    expect(document.querySelector('[role="dialog"][aria-label^="Actions for region"]')).toBeNull(),
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

it("adds a region by coordinates on the shown chromosome, which start as the view's", async () => {
  await act(async () => root!.render(<WorkspaceApp />));
  const add = await vi.waitFor(() => {
    const found = container!.querySelector<HTMLButtonElement>('button[aria-label="Add region"]');
    expect(found).not.toBeNull();
    return found!;
  });
  const form = () => container!.querySelector<HTMLFormElement>('form[aria-label="Add region"]');
  const coordinates = () => form()!.querySelector('fieldset[aria-label="Coordinates"]');
  const position = (index: number) => coordinates()!.querySelectorAll("input")[index];

  await click(add);
  await click(button(form()!, "Add by coordinates"));
  expect(button(form()!, "Add current region")).toBeUndefined();
  expect([position(0).value, position(1).value]).toEqual(["5,225,001", "5,305,000"]);
  expect(document.activeElement).toBe(position(0));

  // Escape and Cancel leave the coordinates, keeping the form open.
  await act(async () =>
    position(0).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
  );
  expect(coordinates()).toBeNull();
  expect(document.activeElement).toBe(button(form()!, "Add by coordinates"));
  await click(button(form()!, "Add by coordinates"));
  await click(button(coordinates()!, "Cancel"));
  expect(coordinates()).toBeNull();

  await click(button(form()!, "Add by coordinates"));
  await type(position(1), "5,000,000");
  await click(button(coordinates()!, "Apply"));
  expect(coordinates()!.textContent).toContain("End must be after start");
  expect(position(1).getAttribute("aria-invalid")).toBe("true");
  expect(saved().highlights).toEqual([]);

  await type(position(0), "5,300,001");
  await type(position(1), "5,310,000");
  await type(form()!.querySelector("input")!, "HS3");
  await click(button(coordinates()!, "Apply"));
  expect(form()).toBeNull();
  await vi.waitFor(() =>
    expect(saved().highlights).toEqual([
      expect.objectContaining({
        name: "HS3",
        region: { chromosome: "chr11", start: 5_300_000, end: 5_310_000 },
      }),
    ]),
  );
});

it("makes an empty group from the heading, with no color, that regions join and leave", async () => {
  await openWithRegions(regionAt("r1", first, "#1976d2"));
  expect(container!.querySelector("h3")?.textContent).toBe("Regions1");
  const addGroup = container!.querySelector<HTMLButtonElement>('button[aria-label="Add group"]')!;
  await click(addGroup);
  expect(addGroup.getAttribute("aria-expanded")).toBe("true");
  expect(groupName().placeholder).toBe("Group 1 (optional)");
  // It starts with no regions, so there are none to recolor.
  expect(applyColor().disabled).toBe(true);
  // The + opens the color picker; Escape and Cancel close it alone, choosing nothing.
  const picker = () => document.querySelector('form[aria-label="Custom color"]');
  const hex = () => picker()!.querySelector<HTMLInputElement>("input:not([type='range'])")!;
  const custom = groupForm()!.querySelector<HTMLButtonElement>(
    'button[aria-label^="Custom color"]',
  )!;
  // The + is a button of its own after the color radios, so Tab reaches it.
  expect(custom.closest('[role="radiogroup"]')).toBeNull();
  expect(custom.tabIndex).toBe(0);
  expect(custom.getAttribute("aria-haspopup")).toBe("dialog");
  await click(custom);
  expect(hex().value).toBe("#1F6FE5");
  await act(async () =>
    hex().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
  );
  await vi.waitFor(() => expect(picker()).toBeNull());
  expect(groupForm()).not.toBeNull();
  await click(custom);
  await type(hex(), "not a color");
  await click(button(picker()!, "Apply"));
  expect(picker()!.textContent).toContain("Enter a hex color like #1F6FE5");
  await type(hex(), "#0A6");
  await click(button(picker()!, "Apply"));
  await vi.waitFor(() => expect(picker()).toBeNull());
  // The + shows the custom color, and no radio is checked.
  expect(custom.getAttribute("aria-label")).toBe("Custom color, #00AA66");
  expect(groupForm()!.querySelector('[role="radio"][aria-checked="true"]')).toBeNull();
  expect(groupForm()!.querySelector('[role="radio"]')!.getAttribute("tabindex")).toBe("0");
  await click(groupForm()!.querySelector('[role="radio"][aria-label="No color"]'));
  await click(button(groupForm()!, "Create group"));
  expect(groupForm()).toBeNull();
  expect(container!.textContent).toContain("No regions in this group");
  await vi.waitFor(() =>
    expect(groups()).toEqual([
      { id: expect.any(String), name: "Group 1", color: null, collapsed: false, regionIds: [] },
    ]),
  );

  // Without a color or regions, the group has none to apply.
  const applyItem = () =>
    [...document.querySelectorAll('[role="menuitem"]')].find(
      (item) => item.textContent === "Apply color to all regions",
    );
  await click(container!.querySelector('[aria-label="Actions for group Group 1"]'));
  expect(applyItem()?.getAttribute("aria-disabled")).toBe("true");
  await act(async () =>
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    ),
  );
  await vi.waitFor(() => expect(applyItem()).toBeUndefined());

  await moveTo(first, "Group 1");
  await vi.waitFor(() => expect(groups()[0].regionIds).toEqual(["r1"]));
  await chooseAction(first, "Remove from group");
  await vi.waitFor(() => expect(groups()).toEqual([expect.objectContaining({ regionIds: [] })]));
  expect(saved().highlights[0].color).toBe("#1976d2");
});

it("starts a new group with the regions checked from those in no group", async () => {
  const third = `${first} (3)`;
  await openWithRegions(
    regionAt("r1", first, "#1976d2"),
    regionAt("r2", second, "#f59e0b"),
    regionAt("r3", third, "#2e7d32"),
  );
  const choices = () =>
    [...groupForm()!.querySelectorAll("fieldset label")].map((label) => [
      label.querySelector(".MuiTypography-body2")?.textContent,
      label.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked,
    ]);
  const choice = (name: string) =>
    [...groupForm()!.querySelectorAll("fieldset label")]
      .find((label) => label.querySelector(".MuiTypography-body2")?.textContent === name)!
      .querySelector("input")!;

  // From a region's menu, that region starts checked.
  await moveTo(first, "Move to new group");
  expect(choices()).toEqual([
    [first, true],
    [second, false],
    [third, false],
  ]);
  expect(groupForm()!.querySelector("fieldset label")!.textContent).toContain(
    "5,225,001-5,305,000",
  );
  await click(choice(third));
  await click(button(groupForm()!, "Create group"));
  await vi.waitFor(() =>
    expect(groups()).toEqual([
      expect.objectContaining({ name: "Group 1", regionIds: ["r1", "r3"] }),
    ]),
  );

  // From the heading, only the regions in no group are offered, none checked.
  await click(container!.querySelector('button[aria-label="Add group"]'));
  expect(choices()).toEqual([[second, false]]);
  expect(applyColor().disabled).toBe(true);
  await click(choice(second));
  await click(applyColor());
  await click(button(groupForm()!, "Create group"));
  await vi.waitFor(() =>
    expect(groups()).toEqual([
      expect.objectContaining({ regionIds: ["r1", "r3"] }),
      expect.objectContaining({ name: "Group 2", regionIds: ["r2"] }),
    ]),
  );
  expect(saved().highlights[1].color).toBe(groups()[1].color);

  // With every region in a group, there are none to offer.
  await click(container!.querySelector('button[aria-label="Add group"]'));
  // A text field's outline is a fieldset too, hidden from assistive technology.
  expect(groupForm()!.querySelector("fieldset:not([aria-hidden])")).toBeNull();
});

it("deletes every region and group after asking", async () => {
  await openWithRegions(regionAt("r1", first, "#1976d2"), regionAt("r2", second, "#f59e0b"));
  await click(container!.querySelector('button[aria-label="Add group"]'));
  await click(button(groupForm()!, "Create group"));
  await vi.waitFor(() => expect(groups()).toHaveLength(1));
  await click(button(container!, "Delete all regions"));
  await click(button(document.querySelector('[role="dialog"]')!, "Delete all"));
  expect(cards()).toEqual([]);
  await vi.waitFor(() => expect(saved().highlights).toEqual([]));
  expect(groups()).toEqual([]);
});

const actionsFor = (region: string) =>
  document.querySelector(`[aria-label="Actions for region ${region}"]`);

function button(within: ParentNode, label: string) {
  return [...within.querySelectorAll("button")].find((button) => button.textContent === label);
}

it("groups regions, collapses and edits a group, and saves groups with the session", async () => {
  await openWithRegions(regionAt("r1", first, "#1976d2"), regionAt("r2", second, "#f59e0b"));
  const [firstId, secondId] = ["r1", "r2"];
  const header = () => container!.querySelector('[aria-label="Saved regions"] [aria-expanded]');
  const members = (name: string) =>
    [...container!.querySelectorAll(`[aria-label="${name}"] li`)].map(
      (card) => card.querySelector(".MuiListItemText-primary")?.textContent,
    );

  await moveTo(first, "Move to new group");
  expect(groupName().placeholder).toBe("Group 1 (optional)");
  await type(groupName(), "Locus control");
  // The group's region takes its color.
  await click(applyColor());
  await click(button(groupForm()!, "Create group"));
  expect(groupForm()).toBeNull();
  // The region's row moves into the group, and focus follows it to its actions button.
  expect(document.activeElement).toBe(actionsFor(first));
  expect(header()?.getAttribute("aria-expanded")).toBe("true");
  expect(members("Locus control")).toEqual([first]);
  // Groups come first, then the regions in none, with no heading.
  const topLevel = () =>
    [...container!.querySelectorAll('[aria-label="Saved regions"] > li')].map(
      (item) =>
        item.querySelector("[aria-expanded]")?.textContent ??
        item.querySelector(".MuiListItemText-primary")?.textContent,
    );
  expect(topLevel()).toEqual(["Locus control1", second]);
  await vi.waitFor(() =>
    expect(groups()).toEqual([
      expect.objectContaining({
        name: "Locus control",
        color: "#1f6fe5",
        collapsed: false,
        regionIds: [firstId],
      }),
    ]),
  );
  expect(saved().highlights.map(({ color }) => color)).toEqual(["#1f6fe5", "#f59e0b"]);

  await moveTo(second, "Locus control");
  expect(members("Locus control")).toEqual([first, second]);
  expect(document.activeElement).toBe(actionsFor(second));

  await click(header());
  expect(header()?.getAttribute("aria-expanded")).toBe("false");
  expect(header()?.textContent).toBe("Locus control2");
  expect(container!.querySelector('[aria-label="Locus control"]')).toBeNull();
  await vi.waitFor(() =>
    expect(groups()).toEqual([
      expect.objectContaining({ collapsed: true, regionIds: [firstId, secondId] }),
    ]),
  );
  await click(header());
  expect(members("Locus control")).toEqual([first, second]);

  // The group's menu renames and recolors it as they change.
  await click(container!.querySelector('[aria-label="Actions for group Locus control"]'));
  const menu = () => document.querySelector('[role="dialog"][aria-label^="Actions for group"]');
  const groupNameField = menu()!.querySelector<HTMLInputElement>('input[aria-label="Group name"]')!;
  expect(document.activeElement).toBe(groupNameField);
  await type(groupNameField, "Enhancers");
  expect(members("Enhancers")).toEqual([first, second]);
  await click(menu()!.querySelector('[aria-label="Group color"] [aria-label="Green"]'));
  await vi.waitFor(() =>
    expect(groups()).toEqual([expect.objectContaining({ name: "Enhancers", color: "#2e7d32" })]),
  );
  // Changing the group's color leaves its regions' highlights alone.
  expect(saved().highlights.map(({ color }) => color)).toEqual(["#1f6fe5", "#f59e0b"]);
  await act(async () =>
    groupNameField.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
  );
  await vi.waitFor(() => expect(menu()).toBeNull());

  // The group's eye hides and shows all of its highlights.
  const hidden = () => saved().highlights.map((highlight) => highlight.hidden === true);
  await click(container!.querySelector('[aria-label="Hide highlights in Enhancers"]'));
  await vi.waitFor(() => expect(hidden()).toEqual([true, true]));
  await click(container!.querySelector('[aria-label="Show highlights in Enhancers"]'));
  await vi.waitFor(() => expect(hidden()).toEqual([false, false]));

  await chooseAction(second, "Remove from group");
  expect(members("Enhancers")).toEqual([first]);
  expect(document.activeElement).toBe(actionsFor(second));
  // Moved into a collapsed group, whose rows are not shown, the region leaves focus on the list.
  await click(header());
  await moveTo(second, "Enhancers");
  expect(document.activeElement).toBe(container!.querySelector('[aria-label="Saved regions"]'));
  await click(header());
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

it("gives every region in a group its color, keeping each one's other settings", async () => {
  await openWithRegions(regionAt("r1", first, "#1976d2"), regionAt("r2", second, "#f59e0b"));
  await moveTo(first, "Move to new group");
  await click(button(groupForm()!, "Create group"));
  await moveTo(second, "Group 1");
  await chooseAction(second, "Hide on tracks");
  await vi.waitFor(() => expect(saved().highlights[1]).toMatchObject({ hidden: true }));
  const before = server.stored.get(id)!.snapshot;

  await chooseGroupAction("Group 1", "Apply color to all regions");

  const recolored = before.browser.highlights.map((highlight) => ({
    ...highlight,
    color: "#1f6fe5",
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

it("opens the menu of a region saved with a named color, with no color chosen", async () => {
  await openWithRegions(regionAt("named", "Named", "tomato"));
  await click(document.querySelector('[aria-label="Actions for region Named"]'));
  const row = document.querySelector('[role="radiogroup"][aria-label="Region color"]')!;
  expect(row.querySelector('[aria-checked="true"]')).toBeNull();
  expect(document.querySelector('[aria-label="Custom color"]')).not.toBeNull();
});

it("moves focus to the row that takes over when a region or group goes", async () => {
  await openWithRegions(
    regionAt("a", "Alpha", "#1976d2"),
    regionAt("b", "Beta", "#1976d2"),
    regionAt("c", "Gamma", "#1976d2"),
    regionAt("d", "Delta", "#1976d2"),
  );
  const focused = (element: Element | null | undefined) =>
    vi.waitFor(() => expect(document.activeElement).toBe(element));
  async function newGroup(region: string, name: string) {
    await moveTo(region, "Move to new group");
    await type(groupName(), name);
    await click(button(groupForm()!, "Create group"));
  }
  async function groupAction(group: string, action: string) {
    await click(container!.querySelector(`[aria-label="Actions for group ${group}"]`));
    await click(
      [...document.querySelectorAll('[role="menuitem"]')].find(
        (item) => item.textContent === action,
      ),
    );
  }

  // A deleted region passes focus to the next row, or the one before when it was last.
  await chooseAction("Beta", "Delete");
  await focused(actionsFor("Gamma"));
  await chooseAction("Delta", "Delete");
  await focused(actionsFor("Gamma"));

  // An ungrouped group passes focus to its first region.
  await newGroup("Alpha", "Kept");
  await groupAction("Kept", "Ungroup");
  await focused(actionsFor("Alpha"));

  // A deleted group passes focus to the row after its regions.
  await newGroup("Gamma", "Gone");
  await groupAction("Gone", "Delete group and regions");
  await click(button(document, "Delete group and regions"));
  await focused(actionsFor("Alpha"));

  // With every region gone, Add region takes focus from the disabled Delete all.
  await click(button(container!, "Delete all regions"));
  await click(button(document.querySelector('[role="dialog"]')!, "Delete all"));
  await focused(container!.querySelector('button[aria-label="Add region"]'));
});
