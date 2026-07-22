import { getOrderedSelectedRows } from "../catalog/catalogOrder";
import { formatCatalogValue, groupRowsByField } from "../catalog/catalogGrouping";
import type { TrackSelectCatalog, TrackSelectView } from "../schema/catalogSchema";

export type SelectedTreeNode = {
  id: string;
  label: string;
  kind: "root" | "group" | "leaf";
  trackIds: string[];
  children?: SelectedTreeNode[];
};

export function buildSelectedTree({
  catalog,
  view,
  selectedIds,
}: {
  catalog: TrackSelectCatalog;
  view: TrackSelectView;
  selectedIds: Set<string>;
}): SelectedTreeNode | undefined {
  const rows = getOrderedSelectedRows(catalog, view, selectedIds);
  if (rows.length === 0) return undefined;

  const children = buildGroupNodes({
    rows,
    grouping: view.grouping,
    leafField: view.leaf,
    catalogId: catalog.id,
    depth: 0,
    path: [],
  });

  return {
    id: `${catalog.id}::root`,
    label: catalog.label,
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
  catalogId,
  depth,
  path,
}: {
  rows: SelectedTreeRow[];
  grouping: string[];
  leafField: string;
  catalogId: string;
  depth: number;
  path: string[];
}): SelectedTreeNode[] {
  if (depth >= grouping.length) {
    return rows.map((row) => ({
      id: `${catalogId}::leaf::${row.id}`,
      label: formatCatalogValue(row[leafField], row.title),
      kind: "leaf",
      trackIds: [row.id],
    }));
  }

  const field = grouping[depth];
  const groupedRows = groupRowsByField(rows, field, (row) => row.id);

  return Array.from(groupedRows, ([value, groupRows]) => {
    const nextPath = [...path, `${field}=${encodeURIComponent(value)}`];

    return {
      id: `${catalogId}::group::${nextPath.join("::")}`,
      label: value,
      kind: "group" as const,
      trackIds: groupRows.map((row) => row.id),
      children: buildGroupNodes({
        rows: groupRows,
        grouping,
        leafField,
        catalogId,
        depth: depth + 1,
        path: nextPath,
      }),
    };
  });
}
