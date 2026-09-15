# Row layout

Call `useRowLayout` from a track renderer to update track height when its visible row count changes. It preserves `config.rowHeight` and calculates total height as `max(1, rowCount) * rowHeight`. Import the hook and its related types and functions from `@weng-lab/genomebrowser-tracks/shared`.

## Size the visible rows

The renderer supplies `rowCount`. When the count depends on genomic features, use those that intersect `TrackRendererProps.visibleRegion`. Continue using `region` and `width` to lay out all data retained for panning.

This example draws a band for each visible row. A full renderer also draws its genomic features and data outside the viewport:

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
      {visibleRows.map((_row, index) => (
        <g key={index} transform={`translate(0, ${index * rowHeight})`}>
          <rect width="100%" height={Math.max(0, rowHeight - 2)} />
        </g>
      ))}
    </g>
  );
}
```

Row height includes the entire vertical slot. Keep gaps and margins inside that slot by reducing the drawn content height, as the two-pixel gap does above. Track height is the combined height of the slots in `base.height`.

## Validation

`RowLayoutConfig` contains `rowHeight: number`. `isRowLayoutConfig` accepts an object with a finite row height of at least 1. Checking the config does not change track height; the renderer must call `useRowLayout` inside `GenomeBrowser` to update it. Invalid row heights throw rather than being clamped. Enforce the same limit in the module's config schema so creation and edits reject invalid values.

## Settings

Use [TrackRowLayoutSettings](../settingsComponents/TrackRowLayoutSettings.md) to edit Height and Row height together while preserving the current row count. For a track with fixed height, use [TrackHeightSettings](../settingsComponents/TrackHeightSettings.md), whose field has a 20-pixel minimum.

## API

| Export                     | Type                                                                                                         | Description                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `RowLayoutConfig`          | `{ rowHeight: number }`                                                                                      | Config containing the complete height of one row slot.                 |
| `isRowLayoutConfig`        | `(value: unknown) => value is RowLayoutConfig`                                                               | Accepts finite row heights at or above 1 pixel.                        |
| `rowCountFromTrackHeight`  | `(trackHeight: number, rowHeight: number) => number`                                                         | Derives the nearest whole row count, with at least one visible row.    |
| `rowHeightFromTrackHeight` | `(trackHeight: number, rowCount: number) => number`                                                          | Derives the complete row-slot height.                                  |
| `trackHeightFromRowCount`  | `(rowCount: number, rowHeight: number) => number`                                                            | Returns `max(1, rowCount) * rowHeight`.                                |
| `useRowLayout`             | `(trackId: string, rowCount: number, config: RowLayoutConfig) => { rowHeight: number; trackHeight: number }` | Returns both heights and updates the stored track height in an effect. |

The conversions require a positive finite track height, a non-negative integer row count, and a finite row height of at least 1 pixel. They throw `RangeError` for invalid inputs.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
