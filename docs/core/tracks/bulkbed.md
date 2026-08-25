# BulkBed Track

`bulkBedModule`, exported by `@weng-lab/genomebrowser-tracks/bulkbed`, renders multiple BigBed datasets in one track.

## Config

```ts
const track = bulkBedModule.create({
  id: "bulk-peaks",
  title: "Bulk peaks",
  config: {
    datasets: [
      { name: "Sample A", url: "YOUR_URL_HERE" },
      { name: "Sample B", url: "YOUR_URL_HERE" },
    ],
  },
});
```

Fields:

- `datasets`: non-empty array of `{ name, url }` entries
- `gap`: optional non-negative pixel gap between datasets

Display modes:

- `full`

Defaults:

- `height`: `80`
- `color`: `#4b9560`
- `display`: `full`

## Fetch Behavior

The module fetches each dataset URL as BigBed data and returns one row array per dataset. Each row is annotated with `datasetName`. One file reader per dataset URL is cached in the track's fetcher resources for the track's lifetime.

Changing any dataset `url` triggers a refetch. Changing dataset `name`, `gap`, or visual base fields does not refetch data. Because fetched rows are annotated with the dataset name, existing tooltip items can retain the previous name until another request runs.
