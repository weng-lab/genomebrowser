# MethylC

`methylCModule` renders plus- and minus-strand CpG, CHG, CHH, and depth channels from BigWig sources.

## Minimal track

The `urls` object requires all eight channel entries. Set a channel URL to an empty string if it has no source.

```ts
import { methylCModule } from "@weng-lab/genomebrowser-tracks/methylc";

const track = methylCModule.create({
  id: "methylation",
  title: "Methylation",
  config: {
    urls: {
      plusStrand: {
        cpg: { url: "YOUR_URL_HERE" },
        chg: { url: "" },
        chh: { url: "" },
        depth: { url: "YOUR_URL_HERE" },
      },
      minusStrand: {
        cpg: { url: "YOUR_URL_HERE" },
        chg: { url: "" },
        chh: { url: "" },
        depth: { url: "YOUR_URL_HERE" },
      },
    },
  },
});
```

## Displays and base defaults

| Field     | Supported or default | Behavior                                                                  |
| --------- | -------------------- | ------------------------------------------------------------------------- |
| `display` | `"split"`            | The only display places plus-strand channels above minus-strand channels. |
| `height`  | `100`                | Initial total height in pixels.                                           |
| `color`   | `"#000000"`          | Browser base color; channel rendering uses `config.colors`.               |

## Config

| Option              | Type                           | Default   | Description                                                                                                                                                   |
| ------------------- | ------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `urls`              | `MethylCUrls`                  | Required  | All plus- and minus-strand `cpg`, `chg`, `chh`, and `depth` URL entries. Every changed channel URL requests data again. Empty strings disable their channels. |
| `colors`            | `MethylCColors`                | See below | Six-digit hexadecimal colors for the four channel types. You may omit the whole object or individual color properties.                                        |
| `maskCpgByCoverage` | `boolean`                      | `false`   | Masks CpG rendering using the corresponding depth channel.                                                                                                    |
| `range`             | `{ min: number; max: number }` | Automatic | Complete methylation range. `min` must be less than `max`. Depth keeps its own automatic range.                                                               |

Color defaults are `cpg: "#648bd8"`, `chg: "#ff944d"`, `chh: "#ff00ff"`, and `depth: "#525252"`. Changing colors, masking, or range redraws the track without requesting data.

Use `methylCModule.configSchema` to validate config and `methylCModule.createInputSchema` to validate the full create input.

## Source requirements

Each non-empty channel URL must be an absolute public HTTP(S) BigWig URL. The server must return `206 Partial Content` for exact byte-range requests and allow browser requests through CORS. An empty URL produces empty channel data without a request.

## Settings and tooltip

The settings panel has URL fields for all eight strand and channel combinations. It also has four channel color controls, a **Mask CpG by coverage** switch, and min/max range controls.

The tooltip lists only channels with a non-empty URL. It orders plus CpG/CHG/CHH/depth before minus CpG/CHG/CHH/depth. Rows use their channel colors and show values with two decimal places, or **No data**. With no channels enabled, the tooltip shows **Channels: None enabled**. The renderer emits `onHover` and `onLeave`, but no click interactions. Every channel uses the shared signal condensation rules, including zero-based half-open overlap boundaries.

## Exported types

| Export                 | Description                                                                |
| ---------------------- | -------------------------------------------------------------------------- |
| `MethylCCreateInput`   | Input accepted by `methylCModule.create`.                                  |
| `MethylCConfig`        | Parsed URLs, colors, masking flag, and optional range.                     |
| `MethylCDisplay`       | `"split"`.                                                                 |
| `MethylCColors`        | CpG, CHG, CHH, and depth color map.                                        |
| `MethylCStrandUrls`    | Four channel URL entries for one strand.                                   |
| `MethylCUrls`          | Plus- and minus-strand URL maps.                                           |
| `MethylCData`          | Eight genomic-reader `BigWigValueRecord` arrays in renderer channel order. |
| `SignalPoint` (shared) | Shared rendered pixel signal point; import it from `/shared`.              |
| `MethylCShowRows`      | Boolean visibility map for all tooltip rows.                               |
| `MethylCTooltipItem`   | Rendered values and row visibility supplied to hover behavior.             |
| `MethylCInteraction`   | Interaction callbacks receiving `MethylCTooltipItem` and `MethylCConfig`.  |
