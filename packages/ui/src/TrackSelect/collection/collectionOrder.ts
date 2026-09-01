import type { TrackSelectView } from "../schema/collectionSchema";
import type { CollectionGridRow, TrackSelectCollectionRecord } from "./collectionCompilation";
import { groupRowsByField } from "./collectionGrouping";

export function getOrderedSelectedRows(
  collection: TrackSelectCollectionRecord,
  view: TrackSelectView,
  selectedIds: Set<string>,
) {
  const selectedRows = collection.rows.filter((row) => selectedIds.has(row.id));
  return flattenRowsByGrouping(selectedRows, view.grouping);
}

function flattenRowsByGrouping(rows: CollectionGridRow[], grouping: string[]) {
  if (grouping.length === 0) return rows;
  return flattenGroup(rows, grouping, 0);
}

function flattenGroup(
  rows: CollectionGridRow[],
  grouping: string[],
  depth: number,
): CollectionGridRow[] {
  if (depth >= grouping.length) return rows;

  const groupedRows = groupRowsByField(rows, grouping[depth], (row) => row.id);

  return Array.from(groupedRows.values()).flatMap((group) =>
    flattenGroup(group, grouping, depth + 1),
  );
}
