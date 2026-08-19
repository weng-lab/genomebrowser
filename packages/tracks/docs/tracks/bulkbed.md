# BulkBed

`bulkBedModule` renders several BigBed datasets as bands in one track.

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

| Field     | Supported or default | Behavior                                                    |
| --------- | -------------------- | ----------------------------------------------------------- |
| `display` | `"full"`             | The only display divides the track height between datasets. |
| `height`  | `80`                 | Initial total height in pixels.                             |
| `color`   | `"#4b9560"`          | Fallback interval color.                                    |

## Config

| Option     | Type               | Default                    | Description                                                                                           |
| ---------- | ------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `datasets` | `BulkBedDataset[]` | Required                   | Non-empty array. Every entry requires a non-empty `name` and `url`; changing a URL requests new data. |
| `gap`      | `number`           | Omitted; renderer uses `2` | Non-negative pixel gap between dataset bands. It does not affect fetching.                            |

Changing a dataset name does not request data again. Fetched rows keep the name from their last request. Their tooltip can show the previous name until a region or source change requests new data. Use `bulkBedModule.configSchema` to validate config and `bulkBedModule.createInputSchema` to validate the full create input.

## Source requirements

Every dataset URL must point to an absolute public HTTP(S) BigBed file. Each server must return `206 Partial Content` for exact byte-range requests and allow browser requests through CORS. The module fetches sources concurrently and reads BED3 coordinates. It leaves additional columns in the row's `fields` array.

## Settings and tooltip

The settings panel edits the gap and ordered dataset list. You can add datasets, edit each required name and URL, or remove a dataset as long as one remains. When `gap` is omitted, the renderer uses 2 pixels. The settings field initially shows 0 until you save a value.

An interval tooltip uses the dataset name as its title. It also shows the feature name, genomic location, strand, and score when present. The renderer passes a `BulkBedRect` with `datasetName` to `onClick`, `onHover`, and `onLeave`.

## Exported types

| Export               | Description                                                        |
| -------------------- | ------------------------------------------------------------------ |
| `BulkBedCreateInput` | Input accepted by `bulkBedModule.create`.                          |
| `BulkBedConfig`      | Parsed datasets and optional gap.                                  |
| `BulkBedDisplay`     | `"full"`.                                                          |
| `BulkBedDataset`     | One `{ name, url }` source entry.                                  |
| `BulkBedRect`        | `BigBedRow` with an optional dataset name.                         |
| `BulkBedData`        | One `BulkBedRect[]` result per dataset.                            |
| `BulkBedInteraction` | Interaction callbacks receiving `BulkBedRect` and `BulkBedConfig`. |
