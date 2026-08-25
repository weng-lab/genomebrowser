# BigBed track

`bigBedModule`, exported by `@weng-lab/genomebrowser-tracks/bigbed`, renders genomic intervals from a BigBed file.

## Config

```ts
const track = bigBedModule.create({
  id: "peaks",
  title: "Peaks",
  config: { url: "YOUR_URL_HERE" },
});
```

Fields:

- `url`: BigBed URL, required

Display modes:

- `dense`
- `squish`

Defaults:

- `height`: `12`
- `color`: `#4b9560`
- `display`: `dense`

## Fetch behavior

Changing `url` triggers a refetch. The track keeps one cached BigBed file reader per URL in the track's fetcher resources for the track's lifetime and replaces it when `url` changes, so file metadata is fetched once per source. The subpath also exports `fetchBigBedRows({ url, region, schema })` for specialized modules that assign names and types to columns after BED3; that helper is uncached. The schema must follow the source file's column order.
