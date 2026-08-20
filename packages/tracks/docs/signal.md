# Signal condensation

The public `@weng-lab/genomebrowser-tracks/shared/signal` subpath converts genomic-reader BigWig records into fixed-width pixel points. It is useful when a custom track needs the same overlap and aggregation behavior as the built-in signal tracks.

## Usage

```ts
import type { BigWigValueRecord } from "@weng-lab/genomic-reader";
import {
  condenseSignalRecords,
  type SignalPoint,
} from "@weng-lab/genomebrowser-tracks/shared/signal";

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

`BigWigValueRecord` and `BigWigSummaryRecord` are existing public types from `@weng-lab/genomic-reader`; `GenomicRegion` is the existing public type from `@weng-lab/genomebrowser`. The signal subpath does not duplicate them.

## Behavior

- The output length is `max(1, floor(width))`.
- Coordinates use zero-based, half-open intervals: `[start, end)`.
- Records on another chromosome, records with no overlap, and records ending at the region start are skipped.
- Records crossing a region boundary are clipped before pixel overlap is calculated.
- A record contributes only to pixels whose genomic span overlaps it. A value record supplies both `min` and `max`; a summary record supplies its own bounds.
- Overlapping records keep the lowest `min` and highest `max`. Pixels without records remain `{ min: null, max: null }`.
