# BigBed

Use `bigBedModule` for genomic intervals stored in one BigBed file. It expects a browser-accessible BigBed URL.

## Usage

```ts
import { bigBedModule } from "@weng-lab/genomebrowser-tracks/bigbed";

const track = bigBedModule.create({
  base: {
    id: "peaks",
    title: "Peaks",
  },
  config: { url: "YOUR_URL_HERE" },
});
```

## bigBedModule

`bigBedModule.create(input, interaction?)` returns a track with `type: "bigbed"`. Register `bigBedModule` with the track store before adding its instances. See [Create and validate tracks](trackCreation.md) for required base fields, source ownership, schemas, and validation errors.

## Displays and base defaults

| Field     | Supported or default             | Behavior                                                                               |
| --------- | -------------------------------- | -------------------------------------------------------------------------------------- |
| `display` | `"dense"` by default, `"squish"` | Dense stretches one row across its slot. Squish packs overlapping intervals into rows. |
| `height`  | `12`                             | Dense one-row height. Squish replaces it with packed row count times `rowHeight`.      |
| `color`   | `"#4b9560"`                      | Fallback interval color when a row has no color.                                       |

## Config

| Option      | Type           | Default  | Description                                                          |
| ----------- | -------------- | -------- | -------------------------------------------------------------------- |
| `url`       | `string`       | Required | Non-empty BigBed source URL. Changing it requests new data.          |
| `bedSchema` | `BedSchemaKey` | `"bed9"` | Selects the positional column parser. Changing it requests new data. |
| `rowHeight` | `number`       | `12`     | Complete vertical row slot. Must be finite and at least 1.           |

### Row height

Dense uses one row. Changing Height or Row height resizes that row.

Squish calculates total height from the packed rows that intersect the visible viewport. It also packs and renders features fetched on either side for panning, but those features do not make the track taller. Panning or loading new data can change the row count while preserving `rowHeight`.

In both displays, feature rectangles and their vertical margins fit inside each row slot.

## Source requirements

The source must be an absolute public HTTP(S) BigBed URL. The server must return `206 Partial Content` for exact byte-range requests and allow browser requests through CORS. See [Data source troubleshooting](../../04-troubleshooting.md) if the file does not load.

The fetcher uses `config.bedSchema` to parse columns after BED3. Omitting it uses BED9, including names, scores, strand, thick coordinates, and RGB colors. Set `bedSchema: "bed3"` to read only coordinates. Columns beyond the selected schema remain in `BigBedRow.fields`. See [BED schemas and colored tracks](../03-dataPrimitives/bedSchemas.md) for available keys and ChromHMM/cCRE examples.

Each mounted track caches a file reader for each URL and schema, reusing metadata across requests. Changing the URL creates or reuses the corresponding reader on the next request.

## Settings and tooltip

The BigBed-specific settings panel has one required URL field. Activate Set to apply a changed URL. The shared base panel provides coordinated Height and Row height fields for both displays.

When available, the interval name becomes the tooltip title. The tooltip also shows the genomic location and any strand or score value. The renderer passes the corresponding `BigBedRow` to supplied `onClick`, `onHover`, and `onLeave` callbacks.

## fetchBigBedRows

Import `fetchBigBedRows` from `@weng-lab/genomebrowser-tracks/bigbed` to read custom columns inside a track fetcher while reusing file metadata across requests.

```ts
fetchBigBedRows({ url, region, schema, resources, signal });
```

`signal` is optional; the other four options are required:

| Option      | Type             | Description                                                                  |
| ----------- | ---------------- | ---------------------------------------------------------------------------- |
| `url`       | `string`         | BigBed source URL, with the same source requirements as the built-in module. |
| `region`    | `GenomicRegion`  | Chromosome and half-open region to read.                                     |
| `schema`    | `z.ZodObject`    | Ordered fields for columns after chromosome, start, and end.                 |
| `resources` | `TrackResources` | The resources supplied to the module's fetch callback.                       |
| `signal`    | `AbortSignal`    | The fetch context's signal. Aborting it stops the read.                      |

The result is `Promise<BigBedRecord<Schema>[]>`, with column types inferred from the schema. Each row includes `chromosome`, `start`, `end`, and unconsumed columns in `fields`. Network, file-reading, and column-validation errors reject the promise.

Readers are cached by URL and schema object identity within the supplied resources. Define schemas outside the fetch callback so successive requests reuse the same object. Changing the URL or schema creates or reuses the matching reader.

Earlier readers remain until the track is removed or the browser unmounts. Separate tracks and browser instances have separate resources. The helper reuses readers, but still reads the requested region on each call.

### Custom-schema module

This narrowPeak example reuses BigBed rendering and supplies its own positional schema. Define the module once and register it with the track store like any other module.

```ts
import { z } from "zod";
import { defineTrackModule, type TrackFetchContext } from "@weng-lab/genomebrowser";
import type { BigBedRecord } from "@weng-lab/genomic-reader";
import {
  bigBedModule,
  fetchBigBedRows,
  type BigBedData,
} from "@weng-lab/genomebrowser-tracks/bigbed";

const narrowPeakSchema = z.object({
  name: z.string(),
  score: z.coerce.number().int().min(0),
  strand: z.string(),
  signalValue: z.coerce.number(),
  pValue: z.coerce.number(),
  qValue: z.coerce.number(),
  peak: z.coerce.number().int().min(-1),
});
type NarrowPeakRow = BigBedRecord<typeof narrowPeakSchema>;
const configSchema = bigBedModule.configSchema.omit({ bedSchema: true });

export const narrowPeakModule = defineTrackModule<NarrowPeakRow>()({
  type: "narrowpeak",
  configSchema,
  defaults: { height: 12, color: "#4b9560" },
  render: bigBedModule.render,
  fetch: ({
    track,
    demand,
    resources,
    signal,
  }: TrackFetchContext<z.output<typeof configSchema>>): Promise<BigBedData> =>
    fetchBigBedRows({
      url: track.config.url,
      region: demand.region,
      schema: narrowPeakSchema,
      resources,
      signal,
    }),
  tooltipComponent: ({ item }) => `${item.name}: signal ${item.signalValue}`,
});

const peaks = narrowPeakModule.create({
  base: { id: "peaks", title: "Peaks" },
  config: { url: "YOUR_URL_HERE" },
});
```

The callback's `Promise<BigBedData>` annotation matches the existing renderer types. The helper itself retains the inferred custom fields, and `defineTrackModule<NarrowPeakRow>()` types tooltip and interaction items with those fields. Reuse requires columns compatible with `BigBedRow`, including numeric coordinates and any optional name, score, strand, or color values.

This schema accepts MACS scores above 1000 and missing-value sentinels of `-1` for p-value, q-value, and summit offset. If a tooltip displays significance, label p-value and q-value fields as negative log10 values and display `-1` as missing.

For reads outside a track, use `createBigBedFile({ url, schema })` from `@weng-lab/genomic-reader` and retain the reader between calls to `file.read(region)`. See [BED schemas](../03-dataPrimitives/bedSchemas.md#reuse-the-schemas) for shared presets.

## Exported types

| Export              | Description                                                     |
| ------------------- | --------------------------------------------------------------- |
| `BigBedCreateInput` | Input accepted by `bigBedModule.create`.                        |
| `BigBedConfig`      | Parsed config with `url` and row height.                        |
| `BigBedDisplay`     | `"dense" \| "squish"`.                                          |
| `BigBedData`        | Array of `BigBedRow` records.                                   |
| `BigBedRow`         | Coordinates, raw extra fields, and optional BED-like metadata.  |
| `BigBedInteraction` | Interaction callbacks receiving `BigBedRow` and `BigBedConfig`. |

See [BED schemas and colored tracks](../03-dataPrimitives/bedSchemas.md) for the shared schema exports and examples. Schema selection is configured through the track API or collection JSON; the settings panel does not edit it.

For column-error messages and schema selection, see [Column validation](../03-dataPrimitives/bedSchemas.md#column-validation).

Return to [Area index](README.md) or [Tracks API reference](../README.md).
