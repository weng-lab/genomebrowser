# CAVE

Use `caveModule` for the package's paired hmC and OXBS datasets. It reads two package-selected hg38 BigWig sources based on neurotransmitter and developmental age. The example selects the GABA adulthood pair.

## Minimal track

```ts
import { caveModule } from "@weng-lab/genomebrowser-tracks/cave";

const track = caveModule.create({
  id: "cave",
  title: "CAVE",
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
