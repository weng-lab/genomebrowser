# BigBed Track

`bigBedModule` renders genomic intervals from a BigBed file.

## Config

```ts
const track = bigBedModule.create({
  id: "peaks",
  title: "Peaks",
  url: "YOUR_URL_HERE",
});
```

Fields:

- `url`: BigBed URL, required
- `schema`: optional Zod object schema for parsing BigBed row columns

Display modes:

- `dense`
- `squish`

Defaults:

- `height`: `60`
- `color`: `#4b9560`
- `display`: `dense`

## Row Schemas

Use `schema` when interactions need typed row fields instead of raw BigBed extra fields. See [BigBed row schemas](../tracks.md#bigbed-row-schemas) for the column-order convention and `InferBigBedRow` usage.

## Fetch Behavior

Changing `url` triggers a refetch. Changing `schema` affects how fetched rows are parsed, but it is not part of the fetch signature. Recreate or refresh the track data when changing a schema for an already-loaded track.
