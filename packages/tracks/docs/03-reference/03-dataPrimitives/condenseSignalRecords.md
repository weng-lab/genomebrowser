# Signal condensation

Use `condenseSignalRecords` from `@weng-lab/genomebrowser-tracks/shared` to combine BigWig records into pixel minima and maxima for a custom signal renderer.

## Usage

```ts
import type { BigWigValueRecord } from "@weng-lab/genomic-reader";
import { condenseSignalRecords, type SignalPoint } from "@weng-lab/genomebrowser-tracks/shared";

const records: readonly BigWigValueRecord[] = [
  { kind: "value", chromosome: "chr1", start: 0, end: 10, value: 2 },
];
const points: SignalPoint[] = condenseSignalRecords(
  records,
  { chromosome: "chr1", start: 0, end: 20 },
  4,
);
```

## API

| Export                  | Type                                                                                                                      | Description                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `condenseSignalRecords` | `(records: readonly (BigWigValueRecord \| BigWigSummaryRecord)[], region: GenomicRegion, width: number) => SignalPoint[]` | Condenses value or summary records into pixel points. |
| `SignalPoint`           | `{ x: number; min: number \| null; max: number \| null }`                                                                 | One zero-based pixel column.                          |

`BigWigValueRecord` and `BigWigSummaryRecord` are types from `@weng-lab/genomic-reader`; `GenomicRegion` is a type from `@weng-lab/genomebrowser`.

## Behavior

Supply a finite pixel width and finite record coordinates. The helper does not validate records. A region whose span is zero or negative returns the allocated empty pixel points.

- The output length is `max(1, floor(width))`.
- Coordinates use zero-based, half-open intervals: `[start, end)`.
- Records on another chromosome, records with no overlap, and records ending at the region start are skipped.
- Records crossing a region boundary are clipped before pixel overlap is calculated.
- A record contributes only to pixels whose genomic span overlaps it. A value record supplies both `min` and `max`; a summary record supplies its own bounds.
- Overlapping records keep the lowest `min` and highest `max`. Pixels without records remain `{ min: null, max: null }`.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
