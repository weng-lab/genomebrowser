import { expect, it } from "vitest";
import { createStores } from "../features/assemblies/assemblies";
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
  return { ...stores.useRegionGroupStore.getState(), stores, groups, members };
}

it("keeps each region in at most one group as regions are added and moved", () => {
  const { groups, members, addToNewGroup, addToGroup, removeFromGroup } = setup();
  const first = addToNewGroup("a", { name: "First", color: "#1a73e8" });
  addToGroup("b", first);
  addToNewGroup("c", { name: "Second", color: "#d93025" });
  expect(members()).toEqual([
    ["First", ["a", "b"]],
    ["Second", ["c"]],
  ]);
  expect(groups()[0]).toMatchObject({ id: first, color: "#1a73e8", collapsed: false });

  // A new group takes its region from the old one, and a group left empty is deleted.
  addToGroup("c", first);
  expect(members()).toEqual([["First", ["a", "b", "c"]]]);
  addToNewGroup("b", { name: "Third", color: "#f9ab00" });
  expect(members()).toEqual([
    ["First", ["a", "c"]],
    ["Third", ["b"]],
  ]);
  removeFromGroup("b");
  expect(members()).toEqual([["First", ["a", "c"]]]);
});

it("follows highlights that are renamed, removed, or cleared", () => {
  const { stores, members, addToNewGroup } = setup();
  addToNewGroup("a", { name: "First", color: "#1a73e8" });
  const browser = () => stores.useBrowserStore.getState();
  const b = browser().highlights[1];
  stores.useRegionGroupStore
    .getState()
    .addToGroup("b", stores.useRegionGroupStore.getState().groups[0].id);

  expect(browser().updateHighlight("b", { ...b, id: "renamed" })).toEqual({ ok: true });
  expect(members()).toEqual([["First", ["a", "renamed"]]]);

  // Unrelated highlight changes leave the groups as they were.
  const before = stores.useRegionGroupStore.getState().groups;
  browser().removeHighlight("c");
  expect(stores.useRegionGroupStore.getState().groups).toBe(before);

  browser().removeHighlight("a");
  expect(members()).toEqual([["First", ["renamed"]]]);
  browser().clearHighlights();
  expect(members()).toEqual([]);
});

it("ungroups a group's regions, or deletes them with it", () => {
  const { stores, members, addToNewGroup, ungroup, deleteGroup } = setup();
  const first = addToNewGroup("a", { name: "First", color: "#1a73e8" });
  const second = addToNewGroup("b", { name: "Second", color: "#d93025" });
  ungroup(first);
  expect(members()).toEqual([["Second", ["b"]]]);
  deleteGroup(second);
  expect(members()).toEqual([]);
  expect(stores.useBrowserStore.getState().highlights.map(({ id }) => id)).toEqual(["a", "c"]);
});

it("edits and collapses groups, and saves and restores them with the session", () => {
  const { stores, groups, addToNewGroup, editGroup, setCollapsed } = setup();
  const id = addToNewGroup("a", { name: "First", color: "#1a73e8" });
  editGroup(id, { name: "Promoters", color: "#188038" });
  setCollapsed(id, true);
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

it("names and colors new groups in turn", () => {
  expect(newGroupDefaults([])).toEqual({ name: "Group 1", color: "#1a73e8" });
  const { groups, addToNewGroup } = setup();
  addToNewGroup("a", { name: "Group 2", color: "#1a73e8" });
  expect(newGroupDefaults(groups())).toEqual({ name: "Group 3", color: "#d93025" });
});
