import { getOrderedSelectedRows } from "../catalog/catalogOrder";
import type { TrackSelectFolder, TrackSelectView } from "../schema/folderSchema";

export type SelectedTreeNode = {
  id: string;
  label: string;
  kind: "root" | "group" | "leaf";
  trackIds: string[];
  children?: SelectedTreeNode[];
};

export function buildSelectedTree({
  folder,
  view,
  selectedIds,
}: {
  folder: TrackSelectFolder;
  view: TrackSelectView;
  selectedIds: Set<string>;
}): SelectedTreeNode | undefined {
  const rows = getOrderedSelectedRows(folder, view, selectedIds);
  if (rows.length === 0) return undefined;

  const children = buildGroupNodes({
    rows,
    grouping: view.grouping,
    leafField: view.leaf,
    folderId: folder.id,
    depth: 0,
    path: [],
  });

  return {
    id: `${folder.id}::root`,
    label: folder.label,
    kind: "root",
    trackIds: rows.map((row) => row.id),
    children,
  };
}

type SelectedTreeRow = ReturnType<typeof getOrderedSelectedRows>[number];

function buildGroupNodes({
  rows,
  grouping,
  leafField,
  folderId,
  depth,
  path,
}: {
  rows: SelectedTreeRow[];
  grouping: string[];
  leafField: string;
  folderId: string;
  depth: number;
  path: string[];
}): SelectedTreeNode[] {
  if (depth >= grouping.length) {
    return rows.map((row) => ({
      id: `${folderId}::leaf::${row.id}`,
      label: formatLabel(row[leafField], row.title),
      kind: "leaf",
      trackIds: [row.id],
    }));
  }

  const field = grouping[depth];
  const groupedRows = new Map<string, SelectedTreeRow[]>();

  for (const row of rows) {
    const value = formatLabel(row[field], row.id);
    const group = groupedRows.get(value);
    if (group) {
      group.push(row);
    } else {
      groupedRows.set(value, [row]);
    }
  }

  return Array.from(groupedRows, ([value, groupRows]) => ({
    id: `${folderId}::group::${[...path, `${field}=${encodeURIComponent(value)}`].join("::")}`,
    label: value,
    kind: "group" as const,
    trackIds: groupRows.map((row) => row.id),
    children: buildGroupNodes({
      rows: groupRows,
      grouping,
      leafField,
      folderId,
      depth: depth + 1,
      path: [...path, `${field}=${encodeURIComponent(value)}`],
    }),
  }));
}

function formatLabel(value: unknown, fallback: string) {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}
