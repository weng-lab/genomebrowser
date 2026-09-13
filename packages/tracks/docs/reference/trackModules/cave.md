# CAVE

Use `caveModule` for the package's paired hmC and OXBS datasets. It reads two package-selected hg38 BigWig sources based on neurotransmitter and developmental age. The example selects the GABA adulthood pair.

## caveModule

Import `caveModule`, `CaveCreateInput`, and `CaveConfig` from `@weng-lab/genomebrowser-tracks/cave`. Register the module with core's track store before adding its instances.

`caveModule.create(input, interaction?)` accepts `CaveCreateInput` and returns a validated track instance. `base.id` and `base.title` are required non-empty strings; `config` is required, with the fields below. Optional `source` defaults to `"user"`; `"host"` marks an application-owned source. Base display, height, and color use the defaults below. A supplied height must be positive and color must use six-digit `#RRGGBB` syntax.

`CaveCreateInput` permits omitted fields with defaults; `CaveConfig` describes the parsed config with defaults applied. `caveModule.validate(instance)` validates an existing complete instance. Both methods throw on invalid input. `configSchema` and `createInputSchema` expose Zod parsing and safe parsing; the top-level config and create-input objects reject unknown keys. `displays` lists supported display names.

Pass callbacks as the second argument to `create`; they are runtime behavior, separate from serialized configuration. Callback support and payloads are described below. The module supplies its fetcher, renderers, settings, and tooltip to core.

## Minimal track

```ts
import { caveModule } from "@weng-lab/genomebrowser-tracks/cave";

const track = caveModule.create({
  base: {
    id: "cave",
    title: "CAVE",
  },
  config: {
    neurotransmitter: "GABA",
    age: "Adulthood",
  },
});
```

## Displays and base defaults

| Field     | Supported or default | Behavior                                                          |
| --------- | -------------------- | ----------------------------------------------------------------- |
| `display` | `"full"`             | The only display draws hmC from the top and OXBS from the bottom. |
| `height`  | `35`                 | Initial height in pixels.                                         |
| `color`   | `"#3333ff"`          | Browser base color; the signals use their config colors.          |

## Config

| Option             | Type              | Default     | Description                                                             |
| ------------------ | ----------------- | ----------- | ----------------------------------------------------------------------- |
| `neurotransmitter` | `"GABA" \| "GLU"` | Required    | Selects the package-defined source pair. Changing it requests new data. |
| `age`              | `CaveAge`         | Required    | Selects a developmental age. Changing it requests new data.             |
| `topColor`         | `string`          | `"#000000"` | Six-digit hexadecimal hmC color.                                        |
| `bottomColor`      | `string`          | `"#000000"` | Six-digit hexadecimal OXBS color.                                       |

`CaveAge` is `"Infancy" | "Early_Childhood" | "Late_Childhood" | "Adolescence" | "Early_Adulthood" | "Adulthood"`. Color changes redraw the track without requesting data.

Use `caveModule.configSchema` to validate config and `caveModule.createInputSchema` to validate the full create input.

## Source requirements

CAVE does not accept source URLs. It builds two public BigWig URLs from `neurotransmitter` and `age`. The files use hg38 and come from a Weng Lab host chosen by the package. This module cannot use another endpoint or assembly.

Each source chooses a BigWig zoom level from the visible region and track width. It falls back to unzoomed values when a source has no suitable zoom level, so the two files do not need matching zoom levels.

The two file readers live in the browser's track-scoped fetcher resources for the track's lifetime, so file metadata and zoom levels are fetched once per source pair and reused by later pans and zooms. Changing `neurotransmitter` or `age` selects a different source pair and creates fresh readers on the next request.

## Settings and tooltip

The settings panel has labeled selectors for neurotransmitter and age. It also has color controls for the top and bottom signals.

The tooltip always lists **hmC** before **OXBS**. Each row uses its signal color and shows the rendered maximum with two decimal places, or **No data**. The renderer emits `onHover` and `onLeave` when either signal has data. It does not emit click interactions. Both channels use the shared signal condensation rules, including zero-based half-open overlap boundaries.

See [Signal condensation](../dataPrimitives/condenseSignalRecords.md) for the shared `SignalPoint` type and pixel aggregation contract.

## Exported types

| Export                 | Description                                                         |
| ---------------------- | ------------------------------------------------------------------- |
| `CaveCreateInput`      | Input accepted by `caveModule.create`.                              |
| `CaveConfig`           | Parsed selection and signal colors after defaults are applied.      |
| `CaveDisplay`          | `"full"`.                                                           |
| `CaveNeurotransmitter` | `"GABA" \| "GLU"`.                                                  |
| `CaveAge`              | Supported developmental-age values.                                 |
| `CaveData`             | Paired top and bottom BigWig record arrays.                         |
| `CaveTooltipItem`      | Rendered X position and optional top and bottom signal points.      |
| `CaveInteraction`      | Interaction callbacks receiving `CaveTooltipItem` and `CaveConfig`. |

`CaveData` is `{ top: BigWigRecord[]; bottom: BigWigRecord[] }`. `CaveTooltipItem` is `{ x: number; top?: SignalPoint; bottom?: SignalPoint }`, with a rendered pixel X position and optional channel points.

## Value labels

Full display labels the opposing 0–1 scales inside the plot: “Top” at the left increases downward, and “Bottom” at the right increases upward. A 0.5 label appears when there is room. Labels use monospace text on translucent white backgrounds and do not intercept pointer interactions. They stay fixed at the visible plot edges during panning and update with the rendered scale. Labels that would overlap vertically are omitted, and tracks shorter than 14 pixels omit labels.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
