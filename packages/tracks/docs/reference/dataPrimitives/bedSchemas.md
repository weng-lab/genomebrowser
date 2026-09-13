# BED schemas and colored tracks

BigBed and BulkBed accept a serializable `config.bedSchema` key. Omission means `"bed9"`. BulkBed applies the same schema to every dataset.

Parsing is strict: missing required columns or values that fail the selected schema cause a fetch error. There is no automatic detection or fallback. Set `bedSchema` to match your files, such as `"bed3"` for coordinate-only data.
Changing the key requests data again using the selected schema. BulkBed applies one schema to every dataset in the track; group datasets with different column layouts into separate tracks.

| Key    | Parsed columns after chromosome, start, and end      |
| ------ | ---------------------------------------------------- |
| `bed3` | None                                                 |
| `bed4` | name                                                 |
| `bed5` | name, score                                          |
| `bed6` | name, score, strand                                  |
| `bed9` | name, score, strand, thickStart, thickEnd, color     |
| `ccre` | BED9 columns followed by ccreClass (Registry BED9+1) |

Score and thick coordinates become numbers. BED9's RGB column becomes a CSS `rgb(...)` color; `0` becomes black. Invalid RGB triples fail parsing. Select a schema matching the source columns: BED5 has a score, while BED9 has an explicit color. Columns beyond the chosen schema remain in `fields`. The schema controls parsing; it does not add thick-region or block rendering.

Both renderers use the parsed color for each interval, with the track color as fallback when no color is parsed. Dense rendering may merge adjacent or overlapping intervals of the same color. Names and scores become available to tooltips and callbacks. The generic tracks retain their generic tooltips; use the cCRE module when you want its specialized tooltip.

## Reuse the schemas

```ts
import { createBigBedFile } from "@weng-lab/genomic-reader";
import {
  bedSchemas,
  bedSchemaKeys,
  type BedSchemaKey,
} from "@weng-lab/genomebrowser-tracks/shared";

const key: BedSchemaKey = "bed9";
const file = createBigBedFile({ url: "YOUR_URL_HERE", schema: bedSchemas[key] });
```

`bedSchemas.ccre` is also the schema used by `ccreBigBedModule`; both paths validate the same columns and colors.

`bedSchemaKeys` lists supported keys, and `bedSchemaKeySchema` is their Zod enum for validating configuration. Custom Zod schemas can still be used in custom module fetchers; they are not accepted as keys in these first-party tracks.

## Exported API

| Export               | Contract                                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `bedSchemas`         | Readonly registry of positional Zod object schemas for columns after BED3. The reader supplies chromosome, start, end, and raw fields. |
| `bedSchemaKeys`      | Ordered array: `bed3`, `bed4`, `bed5`, `bed6`, `bed9`, `ccre`.                                                                         |
| `bedSchemaKeySchema` | Zod enum accepting exactly the supported keys; `.parse` throws on an unknown value and `.safeParse` returns a validation result.       |
| `BedSchemaKey`       | Union of the six registry keys.                                                                                                        |

## Column validation

`bed3` consumes no extra columns. Subsequent presets extend it in file order: `bed4` adds string `name`; `bed5` adds numeric `score`; `bed6` adds string `strand`; `bed9` adds numeric `thickStart`, numeric `thickEnd`, and `color`; `ccre` adds string `ccreClass`. Numeric fields use Zod number coercion. These presets do not constrain strand strings to a fixed vocabulary.

Colors accept `"0"` or three comma-separated integer channels from 0 through 255. `"0"` becomes `rgb(0,0,0)`; triplets become `rgb(R,G,B)`. Invalid colors reject parsing. Reader errors include file-column context; schema parsing alone produces Zod validation errors.

See [BED schema examples](../../legacy/bedSchemaExamples.md) for existing ChromHMM and cCRE sources.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
