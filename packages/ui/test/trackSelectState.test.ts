import { TreeViewBaseItem } from "@mui/x-tree-view";
import { describe, expect, it } from "vitest";
import { FolderDefinition } from "../src/TrackSelect/Folders/types";
import {
  clearDraftSelection,
  removeTreeItemFromDraftSelection,
  updateFolderDraftSelection,
} from "../src/TrackSelect/useTrackSelectState";
import { ExtendedTreeItemProps } from "../src/TrackSelect/types";

interface TestRow {
  id: string;
  label: string;
}

const createTestFolder = (id: string): FolderDefinition<TestRow> => {
  const rows = [
    { id: `${id}-a`, label: `${id} A` },
    { id: `${id}-b`, label: `${id} B` },
    { id: `${id}-c`, label: `${id} C` },
  ];

  return {
    id,
    label: id,
    rowById: new Map(rows.map((row) => [row.id, row])),
    getRowId: (row) => row.id,
    columns: [],
    groupingModel: [],
    leafField: "label",
    buildTree: () => [],
    createTrack: () => null,
  };
};

describe("TrackSelect state helpers", () => {
  it("filters non-row ids before updating the active folder draft", () => {
    const folder = createTestFolder("folder-a");
    const result = updateFolderDraftSelection({
      activeFolder: folder,
      ids: new Set(["folder-a-a", "folder-a-b", "group-row"]),
      maxTracksLimit: 5,
      selectedByFolder: new Map([[folder.id, new Set<string>()]]),
    });

    expect(result.overLimit).toBe(false);
    expect(result.selectedByFolder.get(folder.id)).toEqual(
      new Set(["folder-a-a", "folder-a-b"]),
    );
  });

  it("keeps the previous draft when a selection update exceeds the limit", () => {
    const folderA = createTestFolder("folder-a");
    const folderB = createTestFolder("folder-b");
    const selectedByFolder = new Map([
      [folderA.id, new Set(["folder-a-a"])],
      [folderB.id, new Set(["folder-b-a", "folder-b-b"])],
    ]);

    const result = updateFolderDraftSelection({
      activeFolder: folderA,
      ids: new Set(["folder-a-a", "folder-a-b"]),
      maxTracksLimit: 3,
      selectedByFolder,
    });

    expect(result.overLimit).toBe(true);
    expect(result.selectedByFolder).toBe(selectedByFolder);
  });

  it("clears only the active folder in folder-detail view", () => {
    const selectedByFolder = new Map([
      ["folder-a", new Set(["a1", "a2"])],
      ["folder-b", new Set(["b1"])],
    ]);

    expect(
      clearDraftSelection({
        activeFolderId: "folder-a",
        currentView: "folder-detail",
        folderIds: ["folder-a", "folder-b"],
        selectedByFolder,
      }),
    ).toEqual(
      new Map([
        ["folder-a", new Set<string>()],
        ["folder-b", new Set(["b1"])],
      ]),
    );
  });

  it("clears every folder in folder-list view", () => {
    const selectedByFolder = new Map([
      ["folder-a", new Set(["a1"])],
      ["folder-b", new Set(["b1"])],
    ]);

    expect(
      clearDraftSelection({
        activeFolderId: "folder-a",
        currentView: "folder-list",
        folderIds: ["folder-a", "folder-b"],
        selectedByFolder,
      }),
    ).toEqual(
      new Map([
        ["folder-a", new Set<string>()],
        ["folder-b", new Set<string>()],
      ]),
    );
  });

  it("removes every accession represented by a tree item", () => {
    const item: TreeViewBaseItem<ExtendedTreeItemProps> = {
      id: "node-a",
      label: "Node A",
      folderId: "folder-a",
      allExpAccessions: ["a1", "a3"],
    };

    expect(
      removeTreeItemFromDraftSelection({
        item,
        selectedByFolder: new Map([
          ["folder-a", new Set(["a1", "a2", "a3"])],
          ["folder-b", new Set(["b1"])],
        ]),
      }),
    ).toEqual(
      new Map([
        ["folder-a", new Set(["a2"])],
        ["folder-b", new Set(["b1"])],
      ]),
    );
  });
});
