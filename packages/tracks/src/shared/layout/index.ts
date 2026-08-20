export type HorizontalBounds = { start: number; end: number };

export {
  isRowLayoutConfig,
  rowCountFromTrackHeight,
  rowHeightFromTrackHeight,
  trackHeightFromRowCount,
  useRowLayout,
} from "./rowLayout";
export type { RowLayoutConfig } from "./rowLayout";

export function packRows<T>(
  items: readonly T[],
  getBounds: (item: T) => HorizontalBounds,
  options: { gap?: number } = {},
): T[][] {
  const gap = options.gap ?? 10;
  const measured = items
    .map((item, index) => ({ item, bounds: getBounds(item), index }))
    .sort((a, b) => a.bounds.start - b.bounds.start || a.index - b.index);
  const rows: { items: T[]; end: number }[] = [];

  for (const { item, bounds } of measured) {
    const row = rows.find((candidate) => candidate.end + gap <= bounds.start);
    if (row) {
      row.items.push(item);
      row.end = bounds.end;
    } else {
      rows.push({ items: [item], end: bounds.end });
    }
  }

  return rows.map((row) => row.items);
}
