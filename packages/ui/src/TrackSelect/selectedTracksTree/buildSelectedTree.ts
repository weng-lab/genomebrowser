import { getOrderedSelectedRows } from "../collection/collectionOrder";
import { formatCollectionValue, groupRowsByField } from "../collection/collectionGrouping";
import type { TrackSelectCollectionRecord } from "../collection/collectionCompilation";
import type { TrackSelectView } from "../schema/collectionSchema";

export type SelectedTreeNode = {
  id: string;
  label: string;
  kind: "root" | "group" | "leaf";
  trackIds: string[];
  children?: SelectedTreeNode[];
};

export function buildSelectedTree({
  collection,
  view,
  selectedIds,
}: {
  collection: TrackSelectCollectionRecord;
  view: TrackSelectView;
  selectedIds: Set<string>;
}): SelectedTreeNode | undefined {
  const rows = getOrderedSelectedRows(collection, view, selectedIds);
  if (rows.length === 0) return undefined;

  const children = buildGroupNodes({
    rows,
    grouping: view.grouping,
    leafField: view.leaf,
    collectionId: collection.id,
    depth: 0,
    path: [],
  });

  return {
    id: `${collection.id}::root`,
    label: collection.label,
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
  collectionId,
  depth,
  path,
}: {
  rows: SelectedTreeRow[];
  grouping: string[];
  leafField: string;
  collectionId: string;
  depth: number;
  path: string[];
}): SelectedTreeNode[] {
  if (depth >= grouping.length) {
    return rows.map((row) => ({
      id: `${collectionId}::leaf::${row.id}`,
      label: formatCollectionValue(row[leafField], row.title),
      kind: "leaf",
      trackIds: [row.id],
    }));
  }

  const field = grouping[depth];
  const groupedRows = groupRowsByField(rows, field, (row) => row.id);

  return Array.from(groupedRows, ([value, groupRows]) => {
    const nextPath = [...path, `${field}=${encodeURIComponent(value)}`];

    return {
      id: `${collectionId}::group::${nextPath.join("::")}`,
      label: value,
      kind: "group" as const,
      trackIds: groupRows.map((row) => row.id),
      children: buildGroupNodes({
        rows: groupRows,
        grouping,
        leafField,
        collectionId,
        depth: depth + 1,
        path: nextPath,
      }),
    };
  });
}
