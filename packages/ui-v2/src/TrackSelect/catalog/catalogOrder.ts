import { getCatalogRows, type CatalogGridRow } from "./catalogRows";
import type { TrackSelectCatalog, TrackSelectView } from "../schema/catalogSchema";
import { groupRowsByField } from "./catalogGrouping";

export function getOrderedSelectedRows(
  catalog: TrackSelectCatalog,
  view: TrackSelectView,
  selectedIds: Set<string>,
) {
  const selectedRows = getCatalogRows(catalog).filter((row) => selectedIds.has(row.id));
  return flattenRowsByGrouping(selectedRows, view.grouping);
}

function flattenRowsByGrouping(rows: CatalogGridRow[], grouping: string[]) {
  if (grouping.length === 0) return rows;
  return flattenGroup(rows, grouping, 0);
}

function flattenGroup(rows: CatalogGridRow[], grouping: string[], depth: number): CatalogGridRow[] {
  if (depth >= grouping.length) return rows;

  const groupedRows = groupRowsByField(rows, grouping[depth], (row) => row.id);

  return Array.from(groupedRows.values()).flatMap((group) =>
    flattenGroup(group, grouping, depth + 1),
  );
}
