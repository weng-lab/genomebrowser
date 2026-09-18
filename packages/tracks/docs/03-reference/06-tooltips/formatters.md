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
formatGenomicInterval(1000, 2000, "chr1"); // "chr1:1,000–2,000"
```

## API

All three helpers use the `en-US` locale for deterministic grouping and decimal separators.

| Function                 | Signature                                                       | Behavior                                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formatSignalValue`      | `(value: number \| null \| undefined) => string`                | Formats finite numbers with exactly two decimal places and grouping. Returns `"No data"` for `null`, `undefined`, `NaN`, and infinities.                      |
| `formatOptionalBedValue` | `(value: number \| string \| undefined) => string \| undefined` | Formats finite numbers with at most two decimal places. Trims strings and returns `undefined` for a blank string, `"."`, `undefined`, or a non-finite number. |
| `formatGenomicInterval`  | `(start: number, end: number, chromosome?: string) => string`   | Groups coordinates with no displayed fractional digits and joins them with an en dash. When supplied, the chromosome is prefixed as `chromosome:start–end`.   |

`formatGenomicInterval` only formats its inputs. It does not validate chromosome names, coordinate bounds, or interval direction. It also does not determine whether your data uses zero-based or one-based coordinates.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
