# Shared APIs

Import every shared component, helper, and type from one package path:

```ts
import {
  clientXToTrackX,
  createGenomicXScale,
  packRows,
  type HorizontalBounds,
} from "@weng-lab/genomebrowser-tracks/shared";
```

The shared entry does not load first-party track modules. It uses named ES module exports so bundlers can remove exports that an application does not use. Do not import feature directories such as `/shared/layout` or files under `src`; those are not public package paths.

## Feature groups

The single entry contains five groups:

- `settings` provides the MUI settings components documented in [Author track settings](trackSettings.md).
- `tooltips` provides `TrackTooltip`, its row types, and formatters documented in [Author track tooltips](trackTooltips.md).
- `signal` provides `condenseSignalRecords` and `SignalPoint`, documented in [Signal condensation](signal.md).
- `layout` provides `packRows` and `HorizontalBounds` for horizontal first-fit row packing.
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

## Coordinate conversion

`createGenomicXScale(region, width)` returns an unclamped linear function. It maps `region.start` to `0` and `region.end` to `width`; positions outside the region extrapolate beyond those pixel endpoints.

`clientXToTrackX(clientX, bounds, trackWidth)` converts a viewport client coordinate into track space. It returns `0` when `bounds.width` is zero or negative. Otherwise it applies `((clientX - bounds.left) / bounds.width) * trackWidth` without clamping.

| Export                | Type                                                                                                 | Description                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `createGenomicXScale` | `(region: GenomicRegion, width: number) => (position: number) => number`                             | Creates an unclamped genomic-to-track pixel scale. |
| `clientXToTrackX`     | `(clientX: number, bounds: Readonly<{ left: number; width: number }>, trackWidth: number) => number` | Converts a client X coordinate into track space.   |
