import type { BigBedRow, RenderedBigBedRect } from "./types";
import { packRows } from "../shared/layout";

export function renderDenseBigBedData<Row extends BigBedRow>(
  rows: Row[],
  x: (value: number) => number,
): RenderedBigBedRect<Row>[] {
  const rendered: RenderedBigBedRect<Row>[] = [];
  for (const row of rows.toSorted((a, b) => a.start - b.start)) {
    const previous = rendered[rendered.length - 1];
    if (!previous || row.start > previous.row.end || row.color !== previous.row.color) {
      rendered.push({
        row,
        start: Math.max(0, x(row.start)),
        end: x(row.end),
        color: row.color,
        name: row.name,
        score: row.score,
      });
    } else {
      previous.end = x(row.end);
      previous.row = { ...previous.row, end: row.end } as Row;
    }
  }
  return rendered;
}

export function renderSquishBigBedData<Row extends BigBedRow>(
  rows: Row[],
  x: (value: number) => number,
): RenderedBigBedRect<Row>[][] {
  return packRows(rows, (row) => ({ start: x(row.start), end: x(row.end) })).map((group) =>
    group.map((row) => ({
      row,
      start: Math.max(0, x(row.start)),
      end: x(row.end),
      color: row.color,
      name: row.name,
      score: row.score,
    })),
  );
}
