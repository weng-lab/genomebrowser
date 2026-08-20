# BigWig

`bigWigModule` renders quantitative signal from one BigWig file.

## Minimal track

```ts
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const track = bigWigModule.create({
  id: "signal",
  title: "Signal",
  config: { url: "YOUR_URL_HERE" },
});
```

## Displays and base defaults

| Field     | Supported or default          | Behavior                                                      |
| --------- | ----------------------------- | ------------------------------------------------------------- |
| `display` | `"full"` (default), `"dense"` | Full draws signal around zero. Dense draws an intensity band. |
| `height`  | `80`                          | Initial height in pixels.                                     |
| `color`   | `"#2266aa"`                   | Signal color.                                                 |

## Config

| Option                | Type                             | Default     | Description                                                                                                  |
| --------------------- | -------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| `url`                 | `string`                         | Required    | Non-empty BigWig source URL. Changing it requests new data.                                                  |
| `fillWithZero`        | `boolean`                        | `false`     | Replaces missing rendered pixels with zero.                                                                  |
| `yRange`              | `{ min?: number; max?: number }` | Automatic   | Overrides either automatic Y-axis bound independently. When both are present, `min` must be less than `max`. |
| `showClampIndicators` | `boolean`                        | `true`      | Shows boundary marks for values clipped by the resolved range in full display.                               |
| `clampIndicatorColor` | `string`                         | `"#ff0000"` | Six-digit hexadecimal color for upper and lower clamp marks.                                                 |

Display settings reuse current data. Only a `url` change requests data again. If one Y-range override conflicts with the automatic range, the renderer uses the full automatic range for that render. Dense display does not draw clamp indicators.

Use `bigWigModule.configSchema` to validate config and `bigWigModule.createInputSchema` to validate the full create input.

## Source requirements

The source must be an absolute public HTTP(S) BigWig URL. The server must return `206 Partial Content` for exact byte-range requests and allow browser requests through CORS. The module requests unzoomed `BigWigValueRecord` records from `@weng-lab/genomic-reader` and condenses them into rendered pixels using the shared signal rules.

## Settings and tooltip

The settings panel includes the URL, separate Y-axis bounds, a fill-missing-with-zero switch, a clamp-indicator switch, and the clamp color. Turning off clamp indicators disables the color control but keeps its value.

The tooltip shows the rendered pixel's maximum signal value with two decimal places. It shows **No data** for a missing or non-finite signal. The renderer emits `onHover` and `onLeave` only for pixels that contain signal. It does not emit click interactions.

## Exported types

| Export                 | Description                                                       |
| ---------------------- | ----------------------------------------------------------------- |
| `BigWigCreateInput`    | Input accepted by `bigWigModule.create`.                          |
| `BigWigConfig`         | Parsed config after all schema defaults are applied.              |
| `BigWigDisplay`        | `"full" \| "dense"`.                                              |
| `SignalPoint` (shared) | Shared rendered pixel position; import it from `/shared`.         |
| `YRange`               | Complete numeric `{ min, max }` range.                            |
| `YRangeOverride`       | Optional independent minimum and maximum overrides.               |
| `BigWigInteraction`    | Interaction callbacks receiving `SignalPoint` and `BigWigConfig`. |
