import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  isRowLayoutConfig,
  packRows,
  rowCountFromTrackHeight,
  rowHeightFromTrackHeight,
  trackHeightFromRowCount,
  type HorizontalBounds,
  type RowLayoutConfig,
} from "@weng-lab/genomebrowser-tracks/shared";
import { packViewportRows } from "../../src/shared/layout/viewportRows";

type Item = { id: string; start: number; end: number; label?: string };

describe("packRows", () => {
  it("sorts by occupied start and uses the first row that fits", () => {
    const first = { id: "first", start: 0, end: 2 };
    const second = { id: "second", start: 0, end: 4 };
    const third = { id: "third", start: 5, end: 6 };

    expect(packRows([third, second, first], bounds, { gap: 0 })).toEqual([
      [second, third],
      [first],
    ]);
  });

  it("applies a default gap of 10 and accepts a custom gap", () => {
    const items: Item[] = [
      { id: "a", start: 0, end: 5 },
      { id: "b", start: 15, end: 20 },
    ];

    expect(packRows(items, bounds)).toEqual([items]);
    expect(packRows(items, bounds, { gap: 11 })).toEqual([[items[0]], [items[1]]]);
  });

  it("packs label-style occupied bounds rather than raw feature bounds", () => {
    const items: Item[] = [
      { id: "labeled", start: 0, end: 10, label: "AB" },
      { id: "overlap", start: 39, end: 40 },
      { id: "fits", start: 40, end: 50 },
    ];

    expect(
      packRows(items, (item) => ({
        start: item.start,
        end: item.end + (item.label?.length ?? 0) * 10,
      })),
    ).toEqual([[items[0], items[2]], [items[1]]]);
  });

  it("preserves input and item identity while calculating each bound once", () => {
    const items = Object.freeze([
      Object.freeze({ id: "later", start: 20, end: 21 }),
      Object.freeze({ id: "earlier", start: 0, end: 1 }),
    ]);
    const getBounds = vi.fn(bounds);

    const rows = packRows(items, getBounds, { gap: 0 });

    expect(items.map((item) => item.id)).toEqual(["later", "earlier"]);
    expect(rows).toEqual([[items[1], items[0]]]);
    expect(rows[0][0]).toBe(items[1]);
    expect(getBounds).toHaveBeenCalledTimes(items.length);
  });

  it("keeps equal-start items in input order", () => {
    const items: Item[] = [
      { id: "first", start: 5, end: 6 },
      { id: "second", start: 5, end: 7 },
      { id: "third", start: 5, end: 8 },
    ];

    expect(packRows(items, bounds, { gap: 0 })).toEqual([[items[0]], [items[1]], [items[2]]]);
    expectTypeOf<HorizontalBounds>().toEqualTypeOf<{ start: number; end: number }>();
  });
});

describe("packViewportRows", () => {
  it("keeps overscan items renderable without adding their rows to the visible count", () => {
    const items: Item[] = [
      { id: "offscreen-a", start: -20, end: -5 },
      { id: "offscreen-b", start: -20, end: -5 },
      { id: "offscreen-c", start: -20, end: -5 },
      { id: "visible-a", start: 10, end: 30 },
      { id: "visible-b", start: 15, end: 25 },
    ];

    const packed = packViewportRows(items, bounds, (item) => item.id.startsWith("visible"), {
      gap: 0,
    });

    expect(packed.visibleRowCount).toBe(2);
    expect(packed.rows).toHaveLength(3);
    const renderedIds = packed.rows.flatMap((row) => row.map((item) => item.id)).toSorted();
    expect(renderedIds).toEqual(items.map((item) => item.id).toSorted());
    const visibleItems = packed.rows.slice(0, packed.visibleRowCount).flat();
    expect(visibleItems).toEqual(expect.arrayContaining([items[3], items[4]]));
  });
});

describe("row layout conversions", () => {
  it("keeps row count, full row-slot height, and total track height consistent", () => {
    expect(trackHeightFromRowCount(0, 12)).toBe(12);
    expect(trackHeightFromRowCount(5, 12)).toBe(60);
    expect(rowCountFromTrackHeight(60, 12)).toBe(5);
    expect(rowHeightFromTrackHeight(60, 5)).toBe(12);
  });

  it("detects only configs with a finite row height of at least one pixel", () => {
    const config: unknown = { rowHeight: 12, other: true };

    expect(isRowLayoutConfig(config)).toBe(true);
    if (isRowLayoutConfig(config)) expectTypeOf(config).toMatchTypeOf<RowLayoutConfig>();
    expect(isRowLayoutConfig({ rowHeight: 0 })).toBe(false);
    expect(isRowLayoutConfig({ rowHeight: Number.POSITIVE_INFINITY })).toBe(false);
    expect(isRowLayoutConfig({ rowHeight: "12" })).toBe(false);
    expect(isRowLayoutConfig(null)).toBe(false);
  });

  it("rejects invalid row heights instead of clamping them", () => {
    expect(() => trackHeightFromRowCount(2, 0)).toThrow(/at least 1 pixel/);
    expect(() => rowCountFromTrackHeight(20, Number.NaN)).toThrow(/at least 1 pixel/);
    expect(() => rowHeightFromTrackHeight(1, 2)).toThrow(/at least 1 pixel/);
  });
});

function bounds(item: Item): HorizontalBounds {
  return { start: item.start, end: item.end };
}
