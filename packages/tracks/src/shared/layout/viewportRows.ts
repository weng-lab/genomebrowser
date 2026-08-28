import type { HorizontalBounds } from ".";

type MeasuredItem<T> = {
  item: T;
  bounds: HorizontalBounds;
  index: number;
  visible: boolean;
};

export function packViewportRows<T>(
  items: readonly T[],
  getBounds: (item: T) => HorizontalBounds,
  intersectsViewport: (item: T) => boolean,
  options: { gap?: number } = {},
): { rows: T[][]; visibleRowCount: number } {
  const gap = options.gap ?? 10;
  const measured = items.map((item, index) => ({
    item,
    bounds: getBounds(item),
    index,
    visible: intersectsViewport(item),
  }));
  const visible = measured.filter((item) => item.visible).toSorted(compareMeasured);
  const overscan = measured.filter((item) => !item.visible).toSorted(compareMeasured);
  const rows: MeasuredItem<T>[][] = [];

  addToRows(rows, visible, gap);
  const visibleRowCount = rows.length;
  addToRows(rows, overscan, gap);

  return {
    rows: rows.map((row) => row.toSorted(compareMeasured).map(({ item }) => item)),
    visibleRowCount,
  };
}

function addToRows<T>(rows: MeasuredItem<T>[][], items: MeasuredItem<T>[], gap: number) {
  for (const measured of items) {
    const row = rows.find((candidate) =>
      candidate.every((placed) => separated(placed.bounds, measured.bounds, gap)),
    );
    if (row) row.push(measured);
    else rows.push([measured]);
  }
}

function separated(left: HorizontalBounds, right: HorizontalBounds, gap: number) {
  return left.end + gap <= right.start || right.end + gap <= left.start;
}

function compareMeasured<T>(left: MeasuredItem<T>, right: MeasuredItem<T>) {
  return left.bounds.start - right.bounds.start || left.index - right.index;
}
