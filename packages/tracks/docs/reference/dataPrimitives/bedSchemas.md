# BED schemas and colored tracks

Set `config.bedSchema` on BigBed or BulkBed to match the file's columns. Omitting it selects `"bed9"`. Changing the key requests data again. All datasets in a BulkBed track use the same schema, so put files with different column layouts in separate tracks.

Missing columns or invalid values cause a fetch error. The reader does not detect a different schema or fall back to one.

| Key    | Parsed columns after chromosome, start, and end      |
| ------ | ---------------------------------------------------- |
| `bed3` | None                                                 |
| `bed4` | name                                                 |
| `bed5` | name, score                                          |
| `bed6` | name, score, strand                                  |
| `bed9` | name, score, strand, thickStart, thickEnd, color     |
| `ccre` | BED9 columns followed by ccreClass (Registry BED9+1) |

The reader converts numeric and color fields as described under [Column validation](#column-validation). Columns beyond the selected schema remain in `fields`. Schema selection changes parsing; it does not add thick-region or block rendering.

BigBed and BulkBed draw each feature in its parsed color, falling back to the track color when no color is present. Dense rendering may merge adjacent or overlapping features of the same color. Names and scores are available to tooltips and callbacks. Use [cCRE BigBed](../trackModules/ccre.md) for a tooltip that also displays cCRE classification.

## Reuse the schemas

```ts
import { createBigBedFile } from "@weng-lab/genomic-reader";
import { bedSchemas, type BedSchemaKey } from "@weng-lab/genomebrowser-tracks/shared";

const key: BedSchemaKey = "bed9";
const file = createBigBedFile({ url: "YOUR_URL_HERE", schema: bedSchemas[key] });
```

`bedSchemas.ccre` is also the schema used by `ccreBigBedModule`; both paths validate the same columns and colors.

`bedSchemaKeys` lists supported keys, and `bedSchemaKeySchema` is their Zod enum for validating configuration. Use a custom module fetcher to parse a schema outside these presets. First-party tracks accept only the listed keys.

## Exported API

| Export               | Contract                                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `bedSchemas`         | Readonly registry of positional Zod object schemas for columns after BED3. The reader supplies chromosome, start, end, and raw fields. |
| `bedSchemaKeys`      | Ordered array: `bed3`, `bed4`, `bed5`, `bed6`, `bed9`, `ccre`.                                                                         |
| `bedSchemaKeySchema` | Zod enum accepting exactly the supported keys; `.parse` throws on an unknown value and `.safeParse` returns a validation result.       |
| `BedSchemaKey`       | Union of the six registry keys.                                                                                                        |

## Column validation

The table above lists columns in file order. `name`, `strand`, and `ccreClass` remain strings. Strand values are not restricted to a fixed vocabulary. Score and thick coordinates use Zod number coercion.

Colors accept `"0"` or three comma-separated integers from 0 through 255. `"0"` becomes `rgb(0,0,0)`; triplets become `rgb(R,G,B)`. Other values fail parsing.

BigBed and BulkBed column errors identify the field, one-based BED column number, raw value, record coordinates, and selected `bedSchema`. Short records report expected and actual column counts. An omitted preset is identified as `bed9 (default)`. Network errors retain their original messages. Parsing a schema directly produces Zod errors without the reader's file-column context.

For narrowPeak BED6+4 data, select `bed6` to parse the standard prefix and preserve the four remaining values in `fields`.

See [BED schema examples](../../legacy/bedSchemaExamples.md) for existing ChromHMM and cCRE sources.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
