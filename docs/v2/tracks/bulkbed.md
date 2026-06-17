# BulkBed Track

`bulkBedModule` renders multiple BigBed datasets in one track.

## Config

```ts
const track = bulkBedModule.create({
  id: "bulk-peaks",
  title: "Bulk peaks",
  datasets: [
    { name: "Sample A", url: "YOUR_URL_HERE" },
    { name: "Sample B", url: "YOUR_URL_HERE" },
  ],
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

The module fetches each dataset URL as BigBed data and returns one row array per dataset. Each row is annotated with `datasetName`.

Changing any dataset `url` triggers a refetch. Changing dataset `name`, `gap`, or visual base fields does not refetch data.
