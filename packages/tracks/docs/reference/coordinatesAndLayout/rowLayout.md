# Row layout

Import `useRowLayout`, `RowLayoutConfig`, `isRowLayoutConfig`, and the dimension conversion functions from `@weng-lab/genomebrowser-tracks/shared`.

`isRowLayoutConfig(config)` tests whether a config satisfies the shared row-layout contract. The renderer opts into height synchronization by calling `useRowLayout`; the type guard alone does not activate it. This public type guard accepts a finite numeric `rowHeight` of at least `1`. A module's config schema should enforce the same rule so track creation and updates reject invalid values.

Track height is the total vertical space in `base.height`. Row height is the complete vertical slot for one row in `config.rowHeight`. Content height is the part of that slot used by the drawing. Put margins or gaps inside the slot by reducing content height. Do not add them to track height.

The invariant is:

```ts
trackHeightFromRowCount(rowCount, rowHeight) === Math.max(1, rowCount) * rowHeight;
```

`rowCount` belongs to the renderer, not track config. When genomic features determine the count, calculate it from features that intersect `TrackRendererProps.visibleRegion`. Keep using `TrackRendererProps.region` and `width` to lay out all overscanned data for rendering. Call `useRowLayout` with the visible count. The hook keeps `config.rowHeight` unchanged and updates the browser-owned track height.

```tsx
import type { TrackRendererProps } from "@weng-lab/genomebrowser";
import { useRowLayout, type RowLayoutConfig } from "@weng-lab/genomebrowser-tracks/shared";

type Feature = { start: number; end: number };
type Config = RowLayoutConfig;

export function RowRenderer({
  id,
  config,
  data,
  width,
  visibleRegion,
}: TrackRendererProps<Config, Feature[][]>) {
  const visibleRows = data.filter((row) =>
    row.some((feature) => feature.start < visibleRegion.end && feature.end > visibleRegion.start),
  );
  const { rowHeight, trackHeight } = useRowLayout(id, visibleRows.length, config);

  return (
    <g>
      <rect width={width} height={trackHeight} fill="#ffffff" />
      {visibleRows.map((row, index) => (
        <g key={index} transform={`translate(0, ${index * rowHeight})`}>
          <rect width="100%" height={Math.max(0, rowHeight - 2)} />
        </g>
      ))}
    </g>
  );
}
```

This sizing-only example draws a band for each visible row; a full renderer also lays out its genomic features and overscanned data.

The two-pixel gap in this example reduces content height without making it negative at small valid row heights. It does not change row height or track height. The hook must run inside `GenomeBrowser`. It throws for invalid row height instead of clamping the configured value.

Modules explicitly compose `TrackRowLayoutSettings` for adjacent Height and Row height fields. A Height edit derives row height. A Row height edit derives total track height. Each edit preserves the current derived row count and submits both values in one update. Other modules compose `TrackHeightSettings` for one Height field with a 20-pixel minimum.

| Export                     | Type                                                                                                         | Description                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `RowLayoutConfig`          | `{ rowHeight: number }`                                                                                      | Structural opt-in config. `rowHeight` is the complete vertical slot. |
| `isRowLayoutConfig`        | `(value: unknown) => value is RowLayoutConfig`                                                               | Accepts finite row heights at or above 1 pixel.                      |
| `rowCountFromTrackHeight`  | `(trackHeight: number, rowHeight: number) => number`                                                         | Derives the nearest whole row count, with at least one visible row.  |
| `rowHeightFromTrackHeight` | `(trackHeight: number, rowCount: number) => number`                                                          | Derives the complete row-slot height.                                |
| `trackHeightFromRowCount`  | `(rowCount: number, rowHeight: number) => number`                                                            | Applies the exact `max(1, rowCount) * rowHeight` invariant.          |
| `useRowLayout`             | `(trackId: string, rowCount: number, config: RowLayoutConfig) => { rowHeight: number; trackHeight: number }` | Returns row geometry, then synchronizes browser track state.         |

The conversions require a positive finite track height, a non-negative integer row count, and a finite row height of at least 1 pixel. They throw `RangeError` for invalid inputs.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
