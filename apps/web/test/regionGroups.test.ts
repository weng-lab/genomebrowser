import { expect, it } from "vitest";
import { createStores } from "../features/assemblies/assemblies";
import type { RegionGroup } from "../features/browser/regions/regionGroupSchema";
import { newGroupDefaults } from "../features/browser/regions/regionGroups";
import { sessionSnapshotSchema } from "../features/sessions/snapshot";
import { restore, snapshot } from "../features/sessions/storeSnapshot";

function setup(ids = ["a", "b", "c"]) {
  const stores = createStores("hg38")!;
  ids.forEach((id, index) =>
    stores.useBrowserStore.getState().addHighlight({
      id,
      region: { chromosome: "chr1", start: index * 100, end: index * 100 + 50 },
      color: "#000000",
    }),
  );
  const groups = () => stores.useRegionGroupStore.getState().groups;
  const members = () => groups().map(({ name, regionIds }) => [name, regionIds]);
  const actions = stores.useRegionGroupStore.getState();
  /** Makes a group around `regionId` and returns its ID. */
  const newGroup = (regionId: string, name: string, color = "#1a73e8") => {
    const result = actions.addToNewGroup(regionId, { name, color });
    if (!result.ok) throw new Error(result.error);
    return result.id;
  };
  return { ...actions, stores, groups, members, newGroup };
}

it("keeps each region in at most one group as regions are added and moved", () => {
  const { groups, members, newGroup, addToGroup, removeFromGroup } = setup();
  const first = newGroup("a", "First");
  expect(addToGroup("b", first)).toEqual({ ok: true });
  newGroup("c", "Second", "#d93025");
  expect(members()).toEqual([
    ["First", ["a", "b"]],
    ["Second", ["c"]],
  ]);
  expect(groups()[0]).toMatchObject({ id: first, color: "#1a73e8", collapsed: false });

  // A new group takes its region from the old one, and a group left empty is deleted.
  addToGroup("c", first);
  expect(members()).toEqual([["First", ["a", "b", "c"]]]);
  newGroup("b", "Third", "#f9ab00");
  expect(members()).toEqual([
    ["First", ["a", "c"]],
    ["Third", ["b"]],
  ]);
  expect(removeFromGroup("b")).toEqual({ ok: true });
  expect(members()).toEqual([["First", ["a", "c"]]]);
});

it("moves a region into a new group in one update", () => {
  const { stores, groups, newGroup } = setup();
  newGroup("a", "First");
  const seen: RegionGroup[][] = [];
  stores.useRegionGroupStore.subscribe((state) => seen.push(state.groups));
  newGroup("a", "Second");
  expect(seen.map((groups) => groups.map(({ name }) => name))).toEqual([["Second"]]);
  expect(seen[0]).toBe(groups());
});

it("rejects unknown groups and regions and invalid groups without changing state", () => {
  const { groups, newGroup, ...actions } = setup();
  const first = newGroup("a", "First");
  const before = groups();

  expect(actions.addToGroup("b", "no-such-group")).toMatchObject({
    ok: false,
    code: "GROUP_NOT_FOUND",
  });
  expect(actions.addToGroup("a", "no-such-group")).toMatchObject({ code: "GROUP_NOT_FOUND" });
  expect(actions.addToGroup("missing", first)).toMatchObject({ code: "REGION_NOT_FOUND" });
  expect(actions.addToNewGroup("missing", { name: "Lost", color: "#1a73e8" })).toMatchObject({
    ok: false,
    code: "REGION_NOT_FOUND",
  });
  expect(actions.addToNewGroup("b", { name: "Red", color: "red" })).toMatchObject({
    code: "INVALID_GROUP",
  });
  expect(actions.editGroup(first, { name: "First", color: "red" })).toMatchObject({
    code: "INVALID_GROUP",
  });
  expect(actions.editGroup(first, { name: "", color: "#1a73e8" })).toMatchObject({
    code: "INVALID_GROUP",
  });
  expect(actions.editGroup("no-such-group", { name: "X", color: "#1a73e8" })).toMatchObject({
    code: "GROUP_NOT_FOUND",
  });
  expect(actions.removeFromGroup("missing")).toMatchObject({ code: "REGION_NOT_FOUND" });
  for (const result of [
    actions.setCollapsed("no-such-group", true),
    actions.ungroup("no-such-group"),
    actions.deleteGroup("no-such-group"),
  ])
    expect(result).toMatchObject({ ok: false, code: "GROUP_NOT_FOUND" });
  expect(groups()).toBe(before);
});

it("keeps a renamed region's ID and group, and follows removed or cleared highlights", () => {
  const { stores, members, newGroup, addToGroup } = setup();
  const browser = () => stores.useBrowserStore.getState();
  addToGroup("b", newGroup("a", "First"));

  const b = browser().highlights[1];
  expect(browser().updateHighlight("b", { ...b, name: "Renamed" })).toEqual({ ok: true });
  expect(browser().highlights[1]).toMatchObject({ id: "b", name: "Renamed" });
  expect(members()).toEqual([["First", ["a", "b"]]]);

  // Unrelated highlight changes leave the groups as they were.
  const before = stores.useRegionGroupStore.getState().groups;
  browser().removeHighlight("c");
  expect(stores.useRegionGroupStore.getState().groups).toBe(before);

  browser().removeHighlight("a");
  expect(members()).toEqual([["First", ["b"]]]);
  browser().clearHighlights();
  expect(members()).toEqual([]);
});

it("drops a replaced highlight from its group, never moving another into it", () => {
  const { stores, members, newGroup } = setup(["a", "b"]);
  newGroup("a", "G1");
  newGroup("b", "G2");
  const [, b] = stores.useBrowserStore.getState().highlights;
  const c = { id: "c", region: { chromosome: "chr1", start: 500, end: 600 }, color: "#000000" };
  stores.useBrowserStore.setState({ highlights: [b, c] });
  expect(members()).toEqual([["G2", ["b"]]]);
});

it("ungroups a group's regions, or deletes them with it in one update", () => {
  const { stores, members, newGroup, ungroup, deleteGroup, addToGroup } = setup();
  const first = newGroup("a", "First");
  const second = newGroup("b", "Second");
  addToGroup("c", second);
  expect(ungroup(first)).toEqual({ ok: true });
  expect(members()).toEqual([["Second", ["b", "c"]]]);

  let updates = 0;
  stores.useBrowserStore.subscribe(() => updates++);
  expect(deleteGroup(second)).toEqual({ ok: true });
  expect(updates).toBe(1);
  expect(members()).toEqual([]);
  expect(stores.useBrowserStore.getState().highlights.map(({ id }) => id)).toEqual(["a"]);
});

it("edits and collapses groups, and saves and restores them with the session", () => {
  const { stores, groups, newGroup, editGroup, setCollapsed } = setup();
  const id = newGroup("a", "First");
  expect(editGroup(id, { name: "Promoters", color: "#188038" })).toEqual({ ok: true });
  expect(setCollapsed(id, true)).toEqual({ ok: true });
  expect(groups()).toEqual([
    { id, name: "Promoters", color: "#188038", collapsed: true, regionIds: ["a"] },
  ]);

  const saved = snapshot(stores);
  expect(saved.regionGroups).toEqual(groups());
  const restored = createStores("hg38")!;
  restore(restored, saved);
  expect(restored.useRegionGroupStore.getState().groups).toEqual(groups());
  expect(snapshot(restored)).toEqual(saved);

  // Sessions saved before region groups load with none.
  const { regionGroups: _groups, ...older } = saved;
  expect(sessionSnapshotSchema.parse(older).regionGroups).toEqual([]);
});

it("cleans up stale, repeated, and empty group members when a session loads", () => {
  const saved = snapshot(setup().stores);
  const group = (id: string, regionIds: string[]) => ({
    id,
    name: id,
    color: "#1a73e8",
    collapsed: false,
    regionIds,
  });
  const restored = createStores("hg38")!;
  restore(restored, {
    ...saved,
    regionGroups: [
      group("stale", ["a", "gone"]),
      group("repeated", ["a", "b", "b"]),
      group("empty", []),
      group("allGone", ["gone"]),
    ],
  });
  expect(restored.useRegionGroupStore.getState().groups).toEqual([
    group("stale", ["a"]),
    group("repeated", ["b"]),
  ]);
});

it("rejects saved groups with colors the panel cannot draw", () => {
  const saved = snapshot(setup().stores);
  const group = { id: "g", name: "G", color: "red", collapsed: false, regionIds: ["a"] };
  expect(sessionSnapshotSchema.safeParse({ ...saved, regionGroups: [group] }).success).toBe(false);
  expect(
    sessionSnapshotSchema.safeParse({ ...saved, regionGroups: [{ ...group, color: "#D93025" }] })
      .success,
  ).toBe(true);
});

it("names and colors new groups in turn", () => {
  expect(newGroupDefaults([])).toEqual({ name: "Group 1", color: "#1a73e8" });
  const { groups, newGroup } = setup();
  newGroup("a", "Group 2");
  expect(newGroupDefaults(groups())).toEqual({ name: "Group 3", color: "#d93025" });
});
