import { describe, expect, it } from "vitest";
import { buildSelectedTree } from "../src/TrackSelect/buildSelectedTree";
import { FolderDefinition } from "../src/TrackSelect/Folders/types";
import { resolveFolderView } from "../src/TrackSelect/resolveFolderView";

interface TestRow {
  id: string;
  label: string;
  group: string;
}

const createTestFolder = (
  id: string,
  overrides: Partial<FolderDefinition<TestRow>> = {},
): FolderDefinition<TestRow> => {
  const rows = [
    { id: `${id}-a`, label: `${id} A`, group: "group-1" },
    { id: `${id}-b`, label: `${id} B`, group: "group-1" },
    { id: `${id}-c`, label: `${id} C`, group: "group-2" },
  ];

  return {
    id,
    label: id,
    rows,
    columns: [],
    groupingModel: [],
    leafField: "label",
    createTrack: () => null,
    ...overrides,
  };
};

describe("TrackSelect direct view helpers", () => {
  it("resolves the active folder view with sensible fallback behavior", () => {
    const folder = createTestFolder("folder-a", {
      views: [
        {
          id: "default",
          label: "Default",
          columns: [],
          groupingModel: [],
          leafField: "label",
        },
        {
          id: "runtime",
          label: "Runtime",
          columns: [{ field: "runtime-label" } as never],
          groupingModel: ["group"],
          leafField: "id",
        },
      ],
    });

    expect(resolveFolderView(folder, new Map()).id).toBe("default");
    expect(
      resolveFolderView(folder, new Map([[folder.id, "runtime"]])).id,
    ).toBe("runtime");
    expect(
      resolveFolderView(folder, new Map([[folder.id, "missing"]])).id,
    ).toBe("default");
  });

  it("builds a flat selected tree from the leaf field when there is no grouping", () => {
    const folder = createTestFolder("folder-a");

    const tree = buildSelectedTree({
      folderId: folder.id,
      rootLabel: folder.label,
      selectedRows: folder.rows.slice(0, 2),
      groupingModel: [],
      leafField: "label",
    });

    expect(tree[0]?.label).toBe(folder.label);
    expect(tree[0]?.children?.map((item) => item.label)).toEqual([
      "folder-a A",
      "folder-a B",
    ]);
  });

  it("builds grouped selected trees that match the configured grouping model", () => {
    const folder = createTestFolder("folder-a");

    const tree = buildSelectedTree({
      folderId: folder.id,
      rootLabel: folder.label,
      selectedRows: folder.rows,
      groupingModel: ["group"],
      leafField: "label",
    });

    expect(tree[0]?.children?.map((item) => item.label)).toEqual([
      "group-1",
      "group-2",
    ]);
    expect(tree[0]?.children?.[0]?.children?.map((item) => item.label)).toEqual(
      ["folder-a A", "folder-a B"],
    );
  });
});
