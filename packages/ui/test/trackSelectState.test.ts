import { describe, expect, it } from "vitest";
import { FolderDefinition } from "../src/TrackSelect/Folders/types";
import { deriveTrackSelectViewData } from "../src/TrackSelect/trackSelectViewData";

interface TestRow {
  id: string;
  label: string;
}

const createTestFolder = (
  id: string,
  overrides: Partial<FolderDefinition<TestRow>> = {},
): FolderDefinition<TestRow> => {
  const rows = [
    { id: `${id}-a`, label: `${id} A` },
    { id: `${id}-b`, label: `${id} B` },
    { id: `${id}-c`, label: `${id} C` },
  ];

  return {
    id,
    label: id,
    rows,
    columns: [],
    groupingModel: [],
    leafField: "label",
    buildTree: () => [],
    createTrack: () => null,
    ...overrides,
  };
};

describe("TrackSelect view data helpers", () => {
  it("derives active-folder rows, selection, and count from default folder config", () => {
    const folderA = createTestFolder("folder-a");
    const folderB = createTestFolder("folder-b");

    const viewData = deriveTrackSelectViewData({
      activeFolderId: folderB.id,
      activeViewIdByFolder: new Map(),
      folders: [folderA, folderB],
      selectedByFolder: new Map([
        [folderA.id, new Set(["folder-a-a"])],
        [folderB.id, new Set(["folder-b-a", "folder-b-c"])],
      ]),
    });

    expect(viewData.activeFolder?.id).toBe(folderB.id);
    expect(viewData.activeViewId).toBe("default");
    expect(viewData.rows).toEqual(folderB.rows);
    expect(viewData.selectedIds).toEqual(new Set(["folder-b-a", "folder-b-c"]));
    expect(viewData.selectedCount).toBe(3);
    expect(viewData.activeConfig).toMatchObject({
      columns: folderB.columns,
      groupingModel: folderB.groupingModel,
      leafField: folderB.leafField,
    });
    expect(viewData.activeConfig?.buildTree).toBe(folderB.buildTree);
  });

  it("uses the selected folder view for grid and tree data", () => {
    const folderA = createTestFolder("folder-a");
    const runtimeColumns = [{ field: "runtime-label" } as never];
    const runtimeBuildTree = () => [
      {
        id: "folder-b-runtime",
        label: "runtime",
        allExpAccessions: ["folder-b-a"],
      },
    ];
    const folderB = createTestFolder("folder-b", {
      views: [
        {
          id: "default",
          label: "Default",
          columns: folderA.columns,
          groupingModel: folderA.groupingModel,
          leafField: folderA.leafField,
          buildTree: folderA.buildTree,
        },
        {
          id: "runtime",
          label: "Runtime",
          columns: runtimeColumns,
          groupingModel: ["runtime-group"],
          leafField: "runtime-leaf",
          buildTree: runtimeBuildTree,
        },
      ],
    });

    const viewData = deriveTrackSelectViewData({
      activeFolderId: folderB.id,
      activeViewIdByFolder: new Map([[folderB.id, "runtime"]]),
      folders: [folderA, folderB],
      selectedByFolder: new Map([
        [folderA.id, new Set(["folder-a-a"])],
        [folderB.id, new Set(["folder-b-a", "folder-b-c"])],
      ]),
    });

    expect(viewData.activeViewId).toBe("runtime");
    expect(viewData.activeConfig).toMatchObject({
      columns: runtimeColumns,
      groupingModel: ["runtime-group"],
      leafField: "runtime-leaf",
    });
    expect(viewData.activeConfig?.buildTree).toBe(runtimeBuildTree);
    expect(viewData.folderTrees[1]?.items[0]?.label).toBe("runtime");
  });

  it("builds selected folder trees and tags nested items with their folder IDs", () => {
    const folderA = createTestFolder("folder-a", {
      buildTree: (selectedRows) => [
        {
          id: "folder-a-group",
          label: "Folder A",
          children: selectedRows.map((row) => ({
            id: row.id,
            label: row.id,
            allExpAccessions: [row.id],
          })),
        },
      ],
    });
    const folderB = createTestFolder("folder-b", {
      buildTree: () => [
        {
          id: "folder-b-default",
          label: "default",
          allExpAccessions: ["folder-b-a"],
        },
      ],
    });

    const viewData = deriveTrackSelectViewData({
      activeFolderId: folderA.id,
      activeViewIdByFolder: new Map(),
      folders: [folderA, folderB],
      selectedByFolder: new Map([
        [folderA.id, new Set(["folder-a-a", "folder-a-b"])],
        [folderB.id, new Set(["folder-b-a"])],
      ]),
    });

    expect(viewData.folderTrees).toHaveLength(2);
    expect(viewData.folderTrees[0]?.items[0]?.folderId).toBe(folderA.id);
    expect(viewData.folderTrees[0]?.items[0]?.children?.[0]?.folderId).toBe(
      folderA.id,
    );
    expect(viewData.folderTrees[1]?.items[0]?.label).toBe("default");
    expect(viewData.folderTrees[1]?.items[0]?.folderId).toBe(folderB.id);
  });
});
