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

The shared entry does not load first-party track modules. It uses named ES module exports, which lets a bundler remove unused exports. Do not import feature directories such as `/shared/layout` or files under `src`. They are not public package paths.

## Feature groups

The single entry contains five groups:

- `settings` provides the MUI settings components documented in [Author track settings](trackSettings.md) and the [Settings component API](trackSettingsApi.md).
- `tooltips` provides `TrackTooltip`, its row types, and formatters documented in [Author track tooltips](trackTooltips.md).
- `signal` provides `condenseSignalRecords` and `SignalPoint`, documented in [Signal condensation](signal.md).
- `layout` provides horizontal packing plus row-slot sizing and track-height synchronization.
- `coordinates` provides linear genomic and pointer-coordinate conversion helpers.

These names describe groups of related exports. They are not package subpaths.

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

`packRows` calculates each item's bounds once and then stable-sorts the items by `start`. It places an item in the first row where the previous `end + gap` is less than or equal to the new `start`. The default gap is `10`.

The function returns new row arrays. It preserves item identity and does not modify the input. Include labels or other horizontal decoration in the bounds when those pixels must not overlap.

| Export             | Type                                                                                                      | Description                               |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `HorizontalBounds` | `{ start: number; end: number }`                                                                          | Occupied horizontal bounds for one item.  |
| `packRows`         | `<T>(items: readonly T[], getBounds: (item: T) => HorizontalBounds, options?: { gap?: number }) => T[][]` | Stable, first-fit horizontal row packing. |

## Row layout

A track uses the shared row layout when `isRowLayoutConfig(config)` returns true. This public type guard accepts a finite numeric `rowHeight` of at least `1`. A module's config schema should enforce the same rule so track creation and updates reject invalid values.

Track height is the total vertical space in `base.height`. Row height is the complete vertical slot for one row in `config.rowHeight`. Content height is the part of that slot used by the drawing. Put margins or gaps inside the slot by reducing content height. Do not add them to track height.

The invariant is:

```ts
trackHeightFromRowCount(rowCount, rowHeight) === Math.max(1, rowCount) * rowHeight;
```

`rowCount` belongs to the renderer, not track config. When genomic features determine the count, calculate it from features that intersect `TrackRendererProps.visibleRegion`. Keep using `TrackRendererProps.region` and `width` to lay out all overscanned data for rendering. Call `useRowLayout` with the visible count. The hook keeps `config.rowHeight` unchanged and updates the browser-owned track height.

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

The two-pixel gap in this example reduces content height without making it negative at small valid row heights. It does not change row height or track height. The hook must run inside `GenomeBrowser`. It throws for invalid row height instead of clamping the configured value.

`TrackBaseSettings` detects the same config shape. Row-layout tracks get adjacent Height and Row height fields. A Height edit derives row height. A Row height edit derives total track height. Each edit preserves the current derived row count and submits both values in one update. Other tracks keep one Height field with a 20-pixel minimum.

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

`createGenomicXScale(region, width)` returns an unclamped linear function. It maps `region.start` to `0` and `region.end` to `width`. Positions outside the region extrapolate beyond those pixel endpoints.

`clientXToTrackX(clientX, bounds, trackWidth)` converts a viewport client coordinate into track space. It returns `0` when `bounds.width` is zero or negative. Otherwise, it applies `((clientX - bounds.left) / bounds.width) * trackWidth` without clamping.

| Export                | Type                                                                                                 | Description                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `createGenomicXScale` | `(region: GenomicRegion, width: number) => (position: number) => number`                             | Creates an unclamped genomic-to-track pixel scale. |
| `clientXToTrackX`     | `(clientX: number, bounds: Readonly<{ left: number; width: number }>, trackWidth: number) => number` | Converts a client X coordinate into track space.   |
