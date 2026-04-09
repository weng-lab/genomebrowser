import { describe, expect, it } from "vitest";
import { FolderDefinition } from "../src/TrackSelect/Folders/types";
import {
  createDefaultFolderRuntimeConfig,
  deriveFolderRuntimeConfig,
  updateFolderRuntimeConfigOverrides,
} from "../src/TrackSelect/trackSelectRuntimeConfig";
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
  it("derives active-folder rows, selection, and count from draft state", () => {
    const folderA = createTestFolder("folder-a");
    const folderB = createTestFolder("folder-b");
    const runtimeColumns = [{ field: "runtime-label" } as never];

    const viewData = deriveTrackSelectViewData({
      activeFolderId: folderB.id,
      folders: [folderA, folderB],
      runtimeConfigOverridesByFolder: new Map([
        [
          folderB.id,
          {
            columns: runtimeColumns,
            groupingModel: ["runtime-group"],
            leafField: "runtime-leaf",
          },
        ],
      ]),
      selectedByFolder: new Map([
        [folderA.id, new Set(["folder-a-a"])],
        [folderB.id, new Set(["folder-b-a", "folder-b-c"])],
      ]),
    });

    expect(viewData.activeFolder?.id).toBe(folderB.id);
    expect(viewData.rows).toEqual(folderB.rows);
    expect(viewData.selectedIds).toEqual(new Set(["folder-b-a", "folder-b-c"]));
    expect(viewData.selectedCount).toBe(3);
    expect(viewData.activeConfig).toMatchObject({
      columns: runtimeColumns,
      groupingModel: ["runtime-group"],
      leafField: "runtime-leaf",
    });
    expect(viewData.activeConfig?.buildTree).toBe(folderB.buildTree);
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
      folders: [folderA, folderB],
      runtimeConfigOverridesByFolder: new Map([
        [
          folderB.id,
          {
            columns: folderB.columns,
            groupingModel: folderB.groupingModel,
            leafField: folderB.leafField,
            buildTree: () => [
              {
                id: "folder-b-runtime",
                label: "runtime",
                allExpAccessions: ["folder-b-a"],
              },
            ],
          },
        ],
      ]),
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
    expect(viewData.folderTrees[1]?.items[0]?.label).toBe("runtime");
    expect(viewData.folderTrees[1]?.items[0]?.folderId).toBe(folderB.id);
  });

  it("derives folder runtime config from folder defaults before overrides", () => {
    const folder = createTestFolder("folder-a", {
      buildTree: () => [
        {
          id: "default-tree",
          label: "default tree",
          allExpAccessions: ["folder-a-a"],
        },
      ],
    });

    expect(
      deriveFolderRuntimeConfig({
        folder,
        runtimeConfigOverridesByFolder: new Map(),
      }),
    ).toEqual(createDefaultFolderRuntimeConfig(folder));
  });

  it("merges runtime config overrides for the active folder", () => {
    const folderA = createTestFolder("folder-a");
    const folderB = createTestFolder("folder-b");
    const runtimeColumns = [{ field: "runtime-label" } as never];

    const overrides = updateFolderRuntimeConfigOverrides({
      folder: folderA,
      partial: {
        columns: runtimeColumns,
        groupingModel: ["runtime-group"],
      },
      runtimeConfigOverridesByFolder: new Map([
        [folderB.id, { leafField: "folder-b-leaf" }],
      ]),
    });

    expect(overrides.get(folderA.id)).toEqual({
      columns: runtimeColumns,
      groupingModel: ["runtime-group"],
    });
    expect(overrides.get(folderB.id)).toEqual({ leafField: "folder-b-leaf" });
    expect(
      deriveFolderRuntimeConfig({
        folder: folderA,
        runtimeConfigOverridesByFolder: overrides,
      }),
    ).toMatchObject({
      columns: runtimeColumns,
      groupingModel: ["runtime-group"],
    });
    expect(
      deriveFolderRuntimeConfig({
        folder: folderA,
        runtimeConfigOverridesByFolder: overrides,
      }).buildTree,
    ).toBe(folderA.buildTree);
  });
});
