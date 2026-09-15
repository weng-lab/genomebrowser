# BulkBed

Use `bulkBedModule` to compare several named BigBed datasets in one track. It expects one browser-accessible BigBed URL per dataset.

## Usage

```ts
import { bulkBedModule } from "@weng-lab/genomebrowser-tracks/bulkbed";

const track = bulkBedModule.create({
  base: {
    id: "bulk-peaks",
    title: "Bulk peaks",
  },
  config: {
    datasets: [{ name: "Sample A", url: "YOUR_URL_HERE" }],
  },
});
```

## bulkBedModule

`bulkBedModule.create(input, interaction?)` returns a track with `type: "bulkbed"`. Register `bulkBedModule` with the track store before adding its instances. See [Create and validate tracks](trackCreation.md) for required base fields, source ownership, schemas, and validation errors.

## Displays and base defaults

| Field     | Supported or default | Behavior                                              |
| --------- | -------------------- | ----------------------------------------------------- |
| `display` | `"full"`             | Draws each dataset in one complete vertical row slot. |
| `height`  | `80`                 | Initial height before row-derived rendering.          |
| `color`   | `"#4b9560"`          | Fallback interval color.                              |

## Config

| Option      | Type               | Default                    | Description                                                                                           |
| ----------- | ------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `datasets`  | `BulkBedDataset[]` | Required                   | Non-empty array. Every entry requires a non-empty `name` and `url`; changing a URL requests new data. |
| `gap`       | `number`           | Omitted; renderer uses `2` | Non-negative content spacing inside each row slot. It does not increase total track height.           |
| `bedSchema` | `BedSchemaKey`     | `"bed9"`                   | Selects the positional column parser. Changing it requests new data.                                  |
| `rowHeight` | `number`           | `12`                       | Complete vertical slot for one dataset. Must be finite and at least 1.                                |

### Dataset rows

BulkBed counts datasets with at least one feature in the visible viewport. Their rows appear first, and total height is `max(1, rowCount) * rowHeight`. Datasets with data only outside the viewport remain rendered in later slots for panning without increasing track height. The count can change as the view or data changes; `rowHeight` stays the same.

Within each slot, the renderer subtracts `gap` from the band height and clamps the result to zero. Gaps therefore reduce the drawing height without increasing track height.

Changing a dataset name does not request data again. Fetched rows keep the name from their last request. Their tooltip can show the previous name until a region or source change requests new data.

## Source requirements

Every dataset URL must point to an absolute public HTTP(S) BigBed file. Each server must return `206 Partial Content` for exact byte-range requests and allow browser requests through CORS. See [Data source troubleshooting](../../legacy/dataSources.md) if a file does not load.

The module fetches sources concurrently. All datasets use the track's selected `bedSchema`, or BED9 when omitted. Columns beyond that schema remain in each row's `fields` array.

Each mounted track caches file readers by URL and schema, reusing metadata across requests.

## Settings and tooltip

The settings panel edits the gap and ordered dataset list. Add datasets, edit their names and URLs, or remove a dataset while at least one remains. When `gap` is omitted, the renderer uses 2 pixels. The settings field initially shows 0 until you save a value. The shared base panel provides coordinated Height and Row height fields.

An interval tooltip uses the dataset name as its title. It also shows the feature name, genomic location, strand, and score when present. The renderer passes a `BulkBedRect` with `datasetName` to `onClick`, `onHover`, and `onLeave`.

## Exported types

| Export               | Description                                                        |
| -------------------- | ------------------------------------------------------------------ |
| `BulkBedCreateInput` | Input accepted by `bulkBedModule.create`.                          |
| `BulkBedConfig`      | Parsed datasets, optional gap, and row height.                     |
| `BulkBedDisplay`     | `"full"`.                                                          |
| `BulkBedDataset`     | One `{ name, url }` source entry.                                  |
| `BulkBedRect`        | `BigBedRow` with an optional dataset name.                         |
| `BulkBedData`        | One `BulkBedRect[]` result per dataset.                            |
| `BulkBedInteraction` | Interaction callbacks receiving `BulkBedRect` and `BulkBedConfig`. |

See [BED schemas and colored tracks](../dataPrimitives/bedSchemas.md) for the shared schema exports and examples. Schema selection is configured through the track API or collection JSON; the settings panel does not edit it.

For column-error messages and schema selection, see [Column validation](../dataPrimitives/bedSchemas.md#column-validation).

Return to [Area index](README.md) or [Tracks API reference](../README.md).
