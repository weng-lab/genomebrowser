import type {
  BrowserStoreInstance,
  GenomeBrowserStores,
  MutationFailure,
} from "@weng-lab/genomebrowser";
import { z } from "zod";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { regionGroupSchema, type RegionGroup } from "./regionGroupSchema";

export type RegionGroupErrorCode = "GROUP_NOT_FOUND" | "REGION_NOT_FOUND" | "INVALID_GROUP";

/** A group action's outcome. A failure leaves the groups unchanged. */
export type RegionGroupResult = { ok: true } | MutationFailure<RegionGroupErrorCode>;

type GroupEdit = Pick<RegionGroup, "name" | "color">;
const groupEditSchema = regionGroupSchema.pick({ name: true, color: true });

function parseEdit(edit: GroupEdit) {
  const result = groupEditSchema.safeParse(edit);
  if (result.success) return { ok: true, edit: result.data } as const;
  return {
    ok: false,
    code: "INVALID_GROUP",
    error: `Group is invalid: ${z.prettifyError(result.error)}`,
  } as const;
}

/**
 * Saved regions can be gathered into named, colored groups, like tabs in a browser window.
 * A group's members are highlight IDs, and a region is in at most one group. The store
 * follows the browser's highlights: a removed highlight leaves its group, and a group left
 * empty is deleted.
 */
export type RegionGroupState = {
  groups: RegionGroup[];
  /** Makes a group holding only `regionId`, taken from any other group. */
  addToNewGroup: (
    regionId: string,
    group: GroupEdit,
  ) => { ok: true; id: string } | MutationFailure<RegionGroupErrorCode>;
  /** Moves `regionId` into the group, out of any other. */
  addToGroup: (regionId: string, groupId: string) => RegionGroupResult;
  removeFromGroup: (regionId: string) => RegionGroupResult;
  editGroup: (groupId: string, edit: GroupEdit) => RegionGroupResult;
  setCollapsed: (groupId: string, collapsed: boolean) => RegionGroupResult;
  /** Deletes the group and keeps its regions. */
  ungroup: (groupId: string) => RegionGroupResult;
  /** Deletes the group and its regions' highlights. */
  deleteGroup: (groupId: string) => RegionGroupResult;
};

export type RegionGroupStoreInstance = UseBoundStore<StoreApi<RegionGroupState>>;

/** A session's browser and track stores, with the groups of its saved regions. */
export type SessionStores = GenomeBrowserStores & { useRegionGroupStore: RegionGroupStoreInstance };

/** Colors new groups take in turn, with the names the color picker announces. */
export const groupColors = [
  { name: "Blue", color: "#1a73e8" },
  { name: "Red", color: "#d93025" },
  { name: "Yellow", color: "#f9ab00" },
  { name: "Green", color: "#188038" },
  { name: "Pink", color: "#d01884" },
  { name: "Purple", color: "#a142f4" },
  { name: "Cyan", color: "#007b83" },
  { name: "Orange", color: "#fa903e" },
  { name: "Gray", color: "#5f6368" },
];

/** The name and color a new group starts with: "Group N", and the next color in turn. */
export function newGroupDefaults(groups: readonly RegionGroup[]) {
  const names = new Set(groups.map((group) => group.name));
  let number = groups.length + 1;
  while (names.has(`Group ${number}`)) number++;
  return {
    name: `Group ${number}`,
    color: groupColors[groups.length % groupColors.length].color,
  };
}

/**
 * Keeps only members that are highlights, each in its first group, and drops groups left
 * empty. Returns `groups` itself when they are already clean.
 */
export function normalizeGroups(
  groups: RegionGroup[],
  highlightIds: Iterable<string>,
): RegionGroup[] {
  // Each highlight leaves this set as the first group to hold it takes it.
  const ungrouped = new Set(highlightIds);
  let changed = false;
  const normalized = groups.flatMap((group) => {
    const regionIds = group.regionIds.filter((id) => ungrouped.delete(id));
    if (regionIds.length > 0 && regionIds.length === group.regionIds.length) return [group];
    changed = true;
    return regionIds.length > 0 ? [{ ...group, regionIds }] : [];
  });
  return changed ? normalized : groups;
}

/** Region groups that follow `browserStore`'s highlights for the store's lifetime. */
export function createRegionGroupStore(browserStore: BrowserStoreInstance) {
  const useRegionGroupStore = create<RegionGroupState>()((set, get) => {
    const hasRegion = (regionId: string) =>
      browserStore.getState().highlights.some((highlight) => highlight.id === regionId);
    const regionNotFound = (regionId: string) =>
      ({
        ok: false,
        code: "REGION_NOT_FOUND",
        error: `No saved region has ID ${regionId}.`,
      }) as const;
    const groupNotFound = (groupId: string) =>
      ({ ok: false, code: "GROUP_NOT_FOUND", error: `No group has ID ${groupId}.` }) as const;
    const findGroup = (groupId: string) => get().groups.find((group) => group.id === groupId);

    /** The groups with `regionId` taken out, and any group that leaves empty deleted. */
    const withoutRegion = (regionId: string) =>
      get()
        .groups.map((group) => ({
          ...group,
          regionIds: group.regionIds.filter((id) => id !== regionId),
        }))
        .filter((group) => group.regionIds.length > 0);
    const editOne = (groupId: string, edit: Partial<RegionGroup>): RegionGroupResult => {
      if (!findGroup(groupId)) return groupNotFound(groupId);
      set({
        groups: get().groups.map((group) => (group.id === groupId ? { ...group, ...edit } : group)),
      });
      return { ok: true };
    };
    return {
      groups: [],
      addToNewGroup: (regionId, edit) => {
        if (!hasRegion(regionId)) return regionNotFound(regionId);
        const parsed = parseEdit(edit);
        if (!parsed.ok) return parsed;
        const id = crypto.randomUUID();
        const { name, color } = parsed.edit;
        set({
          groups: [
            ...withoutRegion(regionId),
            { id, name, color, collapsed: false, regionIds: [regionId] },
          ],
        });
        return { ok: true, id };
      },
      addToGroup: (regionId, groupId) => {
        if (!hasRegion(regionId)) return regionNotFound(regionId);
        if (!findGroup(groupId)) return groupNotFound(groupId);
        // The target group is never left empty, since it gains the region.
        const groups = get()
          .groups.map((group) => {
            const regionIds = group.regionIds.filter((id) => id !== regionId);
            return {
              ...group,
              regionIds: group.id === groupId ? [...regionIds, regionId] : regionIds,
            };
          })
          .filter((group) => group.regionIds.length > 0);
        set({ groups });
        return { ok: true };
      },
      removeFromGroup: (regionId) => {
        if (!hasRegion(regionId)) return regionNotFound(regionId);
        set({ groups: withoutRegion(regionId) });
        return { ok: true };
      },
      editGroup: (groupId, edit) => {
        if (!findGroup(groupId)) return groupNotFound(groupId);
        const parsed = parseEdit(edit);
        if (!parsed.ok) return parsed;
        return editOne(groupId, parsed.edit);
      },
      setCollapsed: (groupId, collapsed) => editOne(groupId, { collapsed }),
      ungroup: (groupId) => {
        if (!findGroup(groupId)) return groupNotFound(groupId);
        set({ groups: get().groups.filter((group) => group.id !== groupId) });
        return { ok: true };
      },
      deleteGroup: (groupId) => {
        const group = findGroup(groupId);
        if (!group) return groupNotFound(groupId);
        // Removing its members' highlights deletes the group, which is left empty.
        browserStore.getState().removeHighlights(group.regionIds);
        return { ok: true };
      },
    };
  });

  browserStore.subscribe((state, previous) => {
    if (state.highlights === previous.highlights) return;
    const { groups } = useRegionGroupStore.getState();
    const normalized = normalizeGroups(
      groups,
      state.highlights.map((highlight) => highlight.id),
    );
    // Leave the groups alone, and unsaved, when no member changed.
    if (normalized !== groups) useRegionGroupStore.setState({ groups: normalized });
  });

  return useRegionGroupStore;
}
