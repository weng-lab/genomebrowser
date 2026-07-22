# BigWig Track

`bigWigModule` renders quantitative signal data from a BigWig file.

## Config

```ts
const track = bigWigModule.create({
  id: "signal",
  title: "Signal",
  config: { url: "YOUR_URL_HERE" },
});
```

Fields:

- `url`: BigWig URL, required
- `fillWithZero`: fills missing rendered values with zero when `true`, default `false`
- `yRange`: optional fixed y-axis range with `{ min, max }`; `min` must be less than `max`

Display modes:

- `full`
- `dense`

Defaults:

- `height`: `80`
- `color`: `#2266aa`
- `display`: `full`

## Fetch Behavior

The module fetches data with `genomic-reader` and requires the remote file to be BigWig. Changing `url` triggers a refetch. Changing visual fields such as `fillWithZero`, `yRange`, `color`, `height`, or `display` does not refetch data.
