# Tooltip formatters

Import these pure formatting functions from `@weng-lab/genomebrowser-tracks/shared`.

## Usage

```ts
import {
  formatSignalValue,
  formatOptionalBedValue,
  formatGenomicInterval,
} from "@weng-lab/genomebrowser-tracks/shared";

formatSignalValue(1234.5); // "1,234.50"
formatSignalValue(null); // "No data"
formatOptionalBedValue("."); // undefined
formatGenomicInterval(1000, 2000, "chr1"); // "chr1:1,001–2,000"
```

## API

All three helpers use the `en-US` locale for deterministic grouping and decimal separators.

| Function                 | Signature                                                       | Behavior                                                                                                                                                              |
| ------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formatSignalValue`      | `(value: number \| null \| undefined) => string`                | Formats finite numbers with exactly two decimal places and grouping. Returns `"No data"` for `null`, `undefined`, `NaN`, and infinities.                              |
| `formatOptionalBedValue` | `(value: number \| string \| undefined) => string \| undefined` | Formats finite numbers with at most two decimal places. Trims strings and returns `undefined` for a blank string, `"."`, `undefined`, or a non-finite number.         |
| `formatGenomicInterval`  | `(start: number, end: number, chromosome?: string) => string`   | Shows a zero-based, half-open interval as one-based, inclusive positions joined with an en dash. When supplied, the chromosome is prefixed as `chromosome:start–end`. |

`formatGenomicInterval` expects the zero-based, half-open coordinates used by browser regions and reader records. It adds one to the start and keeps the end, so `[0, 1)` appears as `1–1`, matching the positions shown by the UCSC Genome Browser and the browser controls. It does not validate chromosome names, coordinate bounds, or interval direction.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
