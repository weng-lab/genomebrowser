# CAVE

`caveModule` renders paired hmC and OXBS signals selected by neurotransmitter and developmental age.

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

## Settings and tooltip

The settings panel has labeled selectors for neurotransmitter and age. It also has color controls for the top and bottom signals.

The tooltip always lists **hmC** before **OXBS**. Each row uses its signal color and shows the rendered maximum with two decimal places, or **No data**. The renderer emits `onHover` and `onLeave` when either signal has data. It does not emit click interactions.

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
