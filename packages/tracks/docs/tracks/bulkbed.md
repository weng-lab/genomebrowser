# BulkBed

Use `bulkBedModule` to compare several named BigBed datasets in one track. It expects one browser-accessible BigBed URL per dataset. The example creates one row for a dataset named Sample A.

## Minimal track

```ts
import { bulkBedModule } from "@weng-lab/genomebrowser-tracks/bulkbed";

const track = bulkBedModule.create({
  id: "bulk-peaks",
  title: "Bulk peaks",
  config: {
    datasets: [{ name: "Sample A", url: "YOUR_URL_HERE" }],
  },
});
```

## Displays and base defaults

| Field     | Supported or default | Behavior                                                                    |
| --------- | -------------------- | --------------------------------------------------------------------------- |
| `display` | `"full"`             | Draws each dataset in one complete vertical row slot.                       |
| `height`  | `80`                 | Initial height. Rendering replaces it with dataset count times `rowHeight`. |
| `color`   | `"#4b9560"`          | Fallback interval color.                                                    |

## Config

| Option      | Type               | Default                    | Description                                                                                           |
| ----------- | ------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `datasets`  | `BulkBedDataset[]` | Required                   | Non-empty array. Every entry requires a non-empty `name` and `url`; changing a URL requests new data. |
| `gap`       | `number`           | Omitted; renderer uses `2` | Non-negative content spacing inside each row slot. It does not increase total track height.           |
| `rowHeight` | `number`           | `12`                       | Complete vertical slot for one dataset. Must be finite and at least 1.                                |

BulkBed uses the fetched dataset-array length as its runtime row count. Total height is exactly `max(1, rowCount) * rowHeight`. Each dataset starts at its slot origin. The renderer subtracts `gap` from drawable band height and clamps the result to zero, so content never extends the slot or makes total height larger. Changing viewport or data may change row count, but it does not change configured row height.

Changing a dataset name does not request data again. Fetched rows keep the name from their last request. Their tooltip can show the previous name until a region or source change requests new data. Use `bulkBedModule.configSchema` to validate config and `bulkBedModule.createInputSchema` to validate the full create input.

## Source requirements

Every dataset URL must point to an absolute public HTTP(S) BigBed file. Each server must return `206 Partial Content` for exact byte-range requests and allow browser requests through CORS. See [Data source troubleshooting](../dataSources.md) if a file does not load.

The module fetches sources concurrently and reads BED3 coordinates. It leaves additional columns in the row's `fields` array.

## Settings and tooltip

The BulkBed-specific settings panel edits the gap and ordered dataset list. You can add datasets, edit each required name and URL, or remove a dataset as long as one remains. When `gap` is omitted, the renderer uses 2 pixels. The settings field initially shows 0 until you save a value. The shared base panel provides coordinated Height and Row height fields.

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
