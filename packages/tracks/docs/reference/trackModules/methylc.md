# MethylC

Use `methylCModule` for strand-specific methylation and depth data stored in BigWig files. It accepts eight channel entries and skips channels whose URL is empty.

## Usage

The `urls` object requires all eight channel entries. Set a channel URL to an empty string if it has no source.

```ts
import { methylCModule } from "@weng-lab/genomebrowser-tracks/methylc";

const track = methylCModule.create({
  base: {
    id: "methylation",
    title: "Methylation",
  },
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

## methylCModule

`methylCModule.create(input, interaction?)` returns a track with `type: "methylc"`. Register `methylCModule` with the track store before adding its instances. See [Create and validate tracks](trackCreation.md) for required base fields, source ownership, schemas, and validation errors.

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

## Source requirements

Each non-empty channel URL must be an absolute public HTTP(S) BigWig URL. The server must return `206 Partial Content` for exact byte-range requests and allow browser requests through CORS. See [Data source troubleshooting](../../legacy/dataSources.md) if a file does not load. An empty URL produces empty channel data without a request.

Each enabled channel chooses its own BigWig zoom level from the visible region and track width. It falls back to unzoomed values when that file has no suitable level. Channel files do not need matching zoom levels because the renderer condenses every channel to the same pixel grid.

Each mounted track caches readers by channel URL and reuses metadata and zoom levels across requests. Changing a URL selects the corresponding reader, creating one if needed.

## Settings

The settings panel has URL fields for all eight strand and channel combinations. It also has four channel color controls, a **Mask CpG by coverage** switch, and min/max range controls.

## Tooltip and interactions

The tooltip lists channels with a non-empty URL in the [channel order](#tooltip-and-data-shapes) below. Rows use their channel colors and show values with two decimal places, or **No data**. With no channels enabled, the tooltip shows **Channels: None enabled**.

The renderer emits `onHover` and `onLeave`, but no click interactions. Callbacks receive the rendered values and visibility map described below.

See [Signal condensation](../dataPrimitives/condenseSignalRecords.md) for the shared `SignalPoint` type and pixel aggregation contract.

## Exported types

| Export               | Description                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| `MethylCCreateInput` | Input accepted by `methylCModule.create`.                                 |
| `MethylCConfig`      | Parsed URLs, colors, masking flag, and optional range.                    |
| `MethylCDisplay`     | `"split"`.                                                                |
| `MethylCColors`      | CpG, CHG, CHH, and depth color map.                                       |
| `MethylCStrandUrls`  | Four channel URL entries for one strand.                                  |
| `MethylCUrls`        | Plus- and minus-strand URL maps.                                          |
| `MethylCData`        | Eight genomic-reader `BigWigRecord` arrays in renderer channel order.     |
| `MethylCShowRows`    | Boolean visibility map for all tooltip rows.                              |
| `MethylCTooltipItem` | Rendered values and row visibility supplied to hover behavior.            |
| `MethylCInteraction` | Interaction callbacks receiving `MethylCTooltipItem` and `MethylCConfig`. |

## Tooltip and data shapes

`MethylCData` contains eight `BigWigRecord[]` arrays in the order below. `MethylCShowRows` has one required boolean for each corresponding tooltip row.

| Index | Channel     | Visibility field |
| ----- | ----------- | ---------------- |
| `0`   | Plus CpG    | `fwdCpg`         |
| `1`   | Plus CHG    | `fwdChg`         |
| `2`   | Plus CHH    | `fwdChh`         |
| `3`   | Plus depth  | `fwdDepth`       |
| `4`   | Minus CpG   | `revCpg`         |
| `5`   | Minus CHG   | `revChg`         |
| `6`   | Minus CHH   | `revChh`         |
| `7`   | Minus depth | `revDepth`       |

`MethylCTooltipItem` is `{ tooltipValues: SignalPoint[]; showRows: MethylCShowRows }`. Its values follow the same channel order.

## Value labels

Split display labels the mirrored methylation scale at the left of the plot and the depth scale at the right. Depth labels include a "Depth" prefix. Only configured channel groups receive labels.

Labels use monospace text on translucent white backgrounds and do not intercept pointer interactions. They stay fixed at the visible plot edges during panning and update with the rendered scale. Labels that would overlap vertically are omitted, and tracks shorter than 14 pixels omit labels.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
