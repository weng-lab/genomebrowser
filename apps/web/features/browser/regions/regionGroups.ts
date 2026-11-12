import type { BrowserStoreInstance, GenomeBrowserStores } from "@weng-lab/genomebrowser";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import type { RegionGroup } from "./regionGroupSchema";

/**
 * Saved regions can be gathered into named, colored groups, like tabs in a browser window.
 * A group's members are highlight IDs, and a region is in at most one group. The store
 * follows the browser's highlights: a highlight replaced in place by one with a new ID keeps
 * its group, a removed highlight leaves its group, and a group left empty is deleted.
 */
export type RegionGroupState = {
  groups: RegionGroup[];
  /** Makes a group holding only `regionId`, taken from any other group. Returns its ID. */
  addToNewGroup: (regionId: string, group: Pick<RegionGroup, "name" | "color">) => string;
  /** Moves `regionId` into the group, out of any other. */
  addToGroup: (regionId: string, groupId: string) => void;
  removeFromGroup: (regionId: string) => void;
  editGroup: (groupId: string, edit: Pick<RegionGroup, "name" | "color">) => void;
  setCollapsed: (groupId: string, collapsed: boolean) => void;
  /** Deletes the group and keeps its regions. */
  ungroup: (groupId: string) => void;
  /** Deletes the group and its regions' highlights. */
  deleteGroup: (groupId: string) => void;
};

export type RegionGroupStoreInstance = UseBoundStore<StoreApi<RegionGroupState>>;

/** A session's browser and track stores, with the groups of its saved regions. */
export type SessionStores = GenomeBrowserStores & { useRegionGroupStore: RegionGroupStoreInstance };

/** Colors new groups take in turn. */
export const groupColors = [
  "#1a73e8",
  "#d93025",
  "#f9ab00",
  "#188038",
  "#d01884",
  "#a142f4",
  "#007b83",
  "#fa903e",
  "#5f6368",
];

/** The name and color a new group starts with: "Group N", and the next color in turn. */
export function newGroupDefaults(groups: readonly RegionGroup[]) {
  const names = new Set(groups.map((group) => group.name));
  let number = groups.length + 1;
  while (names.has(`Group ${number}`)) number++;
  return { name: `Group ${number}`, color: groupColors[groups.length % groupColors.length] };
}

/** Region groups that follow `browserStore`'s highlights for the store's lifetime. */
export function createRegionGroupStore(browserStore: BrowserStoreInstance) {
  const useRegionGroupStore = create<RegionGroupState>()((set, get) => {
    /** Applies `change` to every group's members, then deletes groups left empty. */
    function setMembers(change: (regionIds: string[], group: RegionGroup) => string[]) {
      const groups = get()
        .groups.map((group) => ({ ...group, regionIds: change(group.regionIds, group) }))
        .filter((group) => group.regionIds.length > 0);
      set({ groups });
    }
    const without = (regionIds: string[], regionId: string) =>
      regionIds.filter((id) => id !== regionId);
    const editOne = (groupId: string, edit: Partial<RegionGroup>) =>
      set({
        groups: get().groups.map((group) => (group.id === groupId ? { ...group, ...edit } : group)),
      });

    return {
      groups: [],
      addToNewGroup: (regionId, { name, color }) => {
        const id = crypto.randomUUID();
        setMembers((regionIds) => without(regionIds, regionId));
        set({
          groups: [...get().groups, { id, name, color, collapsed: false, regionIds: [regionId] }],
        });
        return id;
      },
      addToGroup: (regionId, groupId) =>
        setMembers((regionIds, group) =>
          group.id === groupId
            ? [...without(regionIds, regionId), regionId]
            : without(regionIds, regionId),
        ),
      removeFromGroup: (regionId) => setMembers((regionIds) => without(regionIds, regionId)),
      editGroup: (groupId, edit) => editOne(groupId, edit),
      setCollapsed: (groupId, collapsed) => editOne(groupId, { collapsed }),
      ungroup: (groupId) => set({ groups: get().groups.filter((group) => group.id !== groupId) }),
      deleteGroup: (groupId) => {
        const regionIds = get().groups.find((group) => group.id === groupId)?.regionIds ?? [];
        // Removing the last member deletes the group.
        for (const regionId of regionIds) browserStore.getState().removeHighlight(regionId);
      },
    };
  });

  browserStore.subscribe((state, previous) => {
    if (state.highlights === previous.highlights) return;
    const next = state.highlights.map((highlight) => highlight.id);
    const present = new Set(next);
    // `updateHighlight` keeps a highlight's position, so a new ID in an old ID's place is a rename.
    const renamed = new Map<string, string>();
    if (next.length === previous.highlights.length)
      previous.highlights.forEach(({ id }, index) => {
        if (id !== next[index] && !present.has(id)) renamed.set(id, next[index]);
      });
    const { groups } = useRegionGroupStore.getState();
    const followed = (regionIds: string[]) =>
      regionIds.map((id) => renamed.get(id) ?? id).filter((id) => present.has(id));
    const unchanged = groups.every((group) => {
      const regionIds = followed(group.regionIds);
      return (
        regionIds.length === group.regionIds.length &&
        regionIds.every((id, index) => id === group.regionIds[index])
      );
    });
    // Leave the groups alone, and unsaved, when no member changed.
    if (unchanged) return;
    useRegionGroupStore.setState({
      groups: groups
        .map((group) => ({ ...group, regionIds: followed(group.regionIds) }))
        .filter((group) => group.regionIds.length > 0),
    });
  });

  return useRegionGroupStore;
}
