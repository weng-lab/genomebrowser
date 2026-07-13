# BigBed Track

`bigBedModule` renders genomic intervals from a BigBed file.

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

- `height`: `60`
- `color`: `#4b9560`
- `display`: `dense`

## Fetch Behavior

Changing `url` triggers a refetch. The built-in module currently exposes only its implementation-backed generic interval behavior. Guidance for schema-specific BigBed modules and renderer reuse is deferred until that extension surface is finalized.
