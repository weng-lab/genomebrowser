# packRows and HorizontalBounds

Pack items into non-overlapping horizontal rows. Import `packRows` and `HorizontalBounds` from `@weng-lab/genomebrowser-tracks/shared`.

## Usage

```ts
import { packRows } from "@weng-lab/genomebrowser-tracks/shared";

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

Empty input returns `[]`. Use finite bounds in a consistent coordinate system; this helper does not validate bounds or gaps. Errors thrown by `getBounds` propagate to the caller.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
