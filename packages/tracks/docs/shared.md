# Shared APIs

Import every shared component, helper, and type from one package path:

```ts
import {
  clientXToTrackX,
  createGenomicXScale,
  isRowLayoutConfig,
  packRows,
  rowCountFromTrackHeight,
  rowHeightFromTrackHeight,
  trackHeightFromRowCount,
  useRowLayout,
  type HorizontalBounds,
  type RowLayoutConfig,
} from "@weng-lab/genomebrowser-tracks/shared";
```

The shared entry does not load first-party track modules. It uses named ES module exports so bundlers can remove exports that an application does not use. Do not import feature directories such as `/shared/layout` or files under `src`; those are not public package paths.

## Feature groups

The single entry contains five groups:

- `settings` provides the MUI settings components documented in [Author track settings](trackSettings.md).
- `tooltips` provides `TrackTooltip`, its row types, and formatters documented in [Author track tooltips](trackTooltips.md).
- `signal` provides `condenseSignalRecords` and `SignalPoint`, documented in [Signal condensation](signal.md).
- `layout` provides horizontal packing plus row-slot sizing and track-height synchronization.
- `coordinates` provides linear genomic and pointer-coordinate conversion helpers.

These groups describe how the source is organized. They are not package subpaths.

## Horizontal row packing

```ts
type Feature = { start: number; end: number; label: string };
const features: Feature[] = [
  { start: 0, end: 20, label: "A" },
  { start: 15, end: 30, label: "B" },
];

const rows = packRows<Feature>(
  features,
  (feature) => ({
    start: feature.start,
    end: feature.end + feature.label.length * 10,
  }),
  { gap: 4 },
);
```

`packRows` calculates each item's bounds once, then stable-sorts items by `start`. It places each item in the first row whose previous `end + gap` is less than or equal to the new `start`. The default gap is `10`. The function returns new row arrays, preserves item identity, and does not modify the input. Include labels or other horizontal decoration in the bounds when those pixels must not overlap.

| Export             | Type                                                                                                      | Description                               |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `HorizontalBounds` | `{ start: number; end: number }`                                                                          | Occupied horizontal bounds for one item.  |
| `packRows`         | `<T>(items: readonly T[], getBounds: (item: T) => HorizontalBounds, options?: { gap?: number }) => T[][]` | Stable, first-fit horizontal row packing. |

## Row layout

A track opts into shared row layout when `isRowLayoutConfig(config)` returns true. This public type guard accepts a finite numeric `rowHeight` of at least `1`. A module's config schema should enforce the same rule so invalid values fail when the track is created or updated. Row height is the complete vertical slot for one row. Put margins or gaps inside that slot by drawing shorter content. Do not add those gaps to total track height.

The invariant is:

```ts
trackHeightFromRowCount(rowCount, rowHeight) === Math.max(1, rowCount) * rowHeight;
```

`rowCount` remains renderer data. Do not add it to track config. When viewport or data changes repack features into a different number of rows, call `useRowLayout` with the new count. The hook keeps `config.rowHeight` unchanged and synchronizes the browser-owned track height.

```tsx
import type { TrackRendererProps } from "@weng-lab/genomebrowser";
import { useRowLayout, type RowLayoutConfig } from "@weng-lab/genomebrowser-tracks/shared";

type Feature = { id: string };
type Config = RowLayoutConfig;

export function RowRenderer({ id, config, data, width }: TrackRendererProps<Config, Feature[][]>) {
  const { rowHeight, trackHeight } = useRowLayout(id, data.length, config);

  return (
    <g>
      <rect width={width} height={trackHeight} fill="#ffffff" />
      {data.map((row, index) => (
        <g key={index} transform={`translate(0, ${index * rowHeight})`}>
          <rect width="100%" height={Math.max(0, rowHeight - 2)} />
        </g>
      ))}
    </g>
  );
}
```

The two-pixel content gap in this example reduces the rectangle height without making it negative at small valid row heights. It does not change `rowHeight` or `trackHeight`. The hook must run inside `GenomeBrowser`. It throws for invalid row height rather than clamping the configured value.

`TrackBaseSettings` detects the same config shape. Row-layout tracks get adjacent Height and Row height fields. Height edits derive row height, and row-height edits derive total height. Each edit preserves the current derived row count and submits both values in one track update. Other tracks retain the Height-only field and its 20-pixel settings minimum.

| Export                     | Type                                                                                                         | Description                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `RowLayoutConfig`          | `{ rowHeight: number }`                                                                                      | Structural opt-in config. `rowHeight` is the complete vertical slot. |
| `isRowLayoutConfig`        | `(value: unknown) => value is RowLayoutConfig`                                                               | Accepts finite row heights at or above 1 pixel.                      |
| `rowCountFromTrackHeight`  | `(trackHeight: number, rowHeight: number) => number`                                                         | Derives the nearest whole row count, with at least one visible row.  |
| `rowHeightFromTrackHeight` | `(trackHeight: number, rowCount: number) => number`                                                          | Derives the complete row-slot height.                                |
| `trackHeightFromRowCount`  | `(rowCount: number, rowHeight: number) => number`                                                            | Applies the exact `max(1, rowCount) * rowHeight` invariant.          |
| `useRowLayout`             | `(trackId: string, rowCount: number, config: RowLayoutConfig) => { rowHeight: number; trackHeight: number }` | Returns row geometry, then synchronizes browser track state.         |

The conversions require a positive finite track height, a non-negative integer row count, and a finite row height of at least 1 pixel. They throw `RangeError` for invalid inputs.

## Coordinate conversion

`createGenomicXScale(region, width)` returns an unclamped linear function. It maps `region.start` to `0` and `region.end` to `width`; positions outside the region extrapolate beyond those pixel endpoints.

`clientXToTrackX(clientX, bounds, trackWidth)` converts a viewport client coordinate into track space. It returns `0` when `bounds.width` is zero or negative. Otherwise it applies `((clientX - bounds.left) / bounds.width) * trackWidth` without clamping.

| Export                | Type                                                                                                 | Description                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `createGenomicXScale` | `(region: GenomicRegion, width: number) => (position: number) => number`                             | Creates an unclamped genomic-to-track pixel scale. |
| `clientXToTrackX`     | `(clientX: number, bounds: Readonly<{ left: number; width: number }>, trackWidth: number) => number` | Converts a client X coordinate into track space.   |
