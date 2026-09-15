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

| Field     | Supported or default            | Behavior                                                                               |
| --------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| `display` | `"dense"` (default), `"squish"` | Dense stretches one row across its slot. Squish packs overlapping intervals into rows. |
| `height`  | `12`                            | Dense one-row height. Squish replaces it with packed row count times `rowHeight`.      |
| `color`   | `"#4b9560"`                     | Fallback interval color when a row has no color.                                       |

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

The source must be an absolute public HTTP(S) BigBed URL. The server must return `206 Partial Content` for exact byte-range requests and allow browser requests through CORS. See [Data source troubleshooting](../../legacy/dataSources.md) if the file does not load.

The fetcher uses `config.bedSchema` to parse columns after BED3. Omitting it uses BED9, including names, scores, strand, thick coordinates, and RGB colors. Set `bedSchema: "bed3"` to read only coordinates. Columns beyond the selected schema remain in `BigBedRow.fields`. See [BED schemas and colored tracks](../dataPrimitives/bedSchemas.md) for available keys and ChromHMM/cCRE examples.

Each mounted track caches a file reader for each URL and schema, reusing metadata across requests. Changing the URL creates or reuses the corresponding reader on the next request.

## Settings and tooltip

The BigBed-specific settings panel has one required URL field. Activate Set to apply a changed URL. The shared base panel provides coordinated Height and Row height fields for both displays.

When available, the interval name becomes the tooltip title. The tooltip also shows the genomic location and any strand or score value. The renderer passes the corresponding `BigBedRow` to supplied `onClick`, `onHover`, and `onLeave` callbacks.

For custom BigBed reading, use `createBigBedFile({ url, schema })` from `@weng-lab/genomic-reader` and call `file.read(region)`. See [BED schemas](../dataPrimitives/bedSchemas.md#reuse-the-schemas) for shared presets.

## Exported types

| Export              | Description                                                     |
| ------------------- | --------------------------------------------------------------- |
| `BigBedCreateInput` | Input accepted by `bigBedModule.create`.                        |
| `BigBedConfig`      | Parsed config with `url` and row height.                        |
| `BigBedDisplay`     | `"dense" \| "squish"`.                                          |
| `BigBedData`        | Array of `BigBedRow` records.                                   |
| `BigBedRow`         | Coordinates, raw extra fields, and optional BED-like metadata.  |
| `BigBedInteraction` | Interaction callbacks receiving `BigBedRow` and `BigBedConfig`. |

See [BED schemas and colored tracks](../dataPrimitives/bedSchemas.md) for the shared schema exports and examples. Schema selection is configured through the track API or collection JSON; the settings panel does not edit it.

For column-error messages and schema selection, see [Column validation](../dataPrimitives/bedSchemas.md#column-validation).

Return to [Area index](README.md) or [Tracks API reference](../README.md).
