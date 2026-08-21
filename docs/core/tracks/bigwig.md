# BigWig Track

`bigWigModule`, exported by `@weng-lab/genomebrowser-tracks/bigwig`, renders quantitative signal data from a BigWig file.

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
- `showClampIndicators`: shows out-of-range boundary indicators in full mode, default `true`
- `clampIndicatorColor`: six-digit `#RRGGBB` color shared by the upper and lower indicators, default `#ff0000`

Display modes:

- `full`
- `dense`

Defaults:

- `height`: `80`
- `color`: `#2266aa`
- `display`: `full`

## Clamp indicators

Full mode clips signal geometry to the active Y range. Values above or below a fixed `yRange` also render short clamp indicators at the corresponding boundary when `showClampIndicators` is enabled. Hiding the indicators does not change clipping. Dense mode does not render clamp indicators.

The settings panel exposes a **Show clamp indicators** checkbox and a text **Clamp indicator color** input. The color input reflects the validated config and is disabled, without clearing its value, while indicators are hidden. One configured color applies to both boundaries.

## Fetch Behavior

The module fetches data with `genomic-reader` and requires the remote file to be BigWig. It caches the file reader in the track's fetcher resources for the track's lifetime and replaces it when `url` changes, so file metadata is fetched once per source. Changing `url` triggers a refetch. Changing visual fields such as `fillWithZero`, `yRange`, `showClampIndicators`, `clampIndicatorColor`, `color`, `height`, or `display` does not refetch data.
