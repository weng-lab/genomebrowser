import { getCatalogRows, type CatalogGridRow } from "./catalogRows";
import type { TrackSelectFolder, TrackSelectView } from "../schema/folderSchema";

export function getOrderedSelectedRows(
  folder: TrackSelectFolder,
  view: TrackSelectView,
  selectedIds: Set<string>,
) {
  const selectedRows = getCatalogRows(folder).filter((row) => selectedIds.has(row.id));
  return flattenRowsByGrouping(selectedRows, view.grouping);
}

function flattenRowsByGrouping(rows: CatalogGridRow[], grouping: string[]) {
  if (grouping.length === 0) return rows;
  return flattenGroup(rows, grouping, 0);
}

function flattenGroup(
  rows: CatalogGridRow[],
  grouping: string[],
  depth: number,
): CatalogGridRow[] {
  if (depth >= grouping.length) return rows;

  const field = grouping[depth];
  const groupedRows = new Map<string, CatalogGridRow[]>();

  for (const row of rows) {
    const value = formatGroupValue(row[field], row.id);
    const group = groupedRows.get(value);
    if (group) {
      group.push(row);
    } else {
      groupedRows.set(value, [row]);
    }
  }

  return Array.from(groupedRows.values()).flatMap((group) =>
    flattenGroup(group, grouping, depth + 1),
  );
}

function formatGroupValue(value: unknown, fallback: string) {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}
