# CAVE track

Use `caveModule` to display paired hmC and OXBS methylation signals from the package-defined CAVE datasets. The top signal represents hmC and the bottom signal represents OXBS for one neurotransmitter and developmental age.

## Usage

Create the track and register `caveModule` with the track store:

```ts
import { caveModule, createTrackStore } from "@weng-lab/genomebrowser";

const caveTrack = caveModule.create({
  id: "cave",
  title: "CAVE",
  config: {
    neurotransmitter: "GABA",
    age: "Adulthood",
  },
});

const useTrackStore = createTrackStore({
  modules: [caveModule],
  tracks: [caveTrack],
});
```

The module chooses its data URLs from `neurotransmitter` and `age`; it does not accept application-provided URLs.

## Configure colors

The top and bottom signals use their concrete config colors directly. Both default to `"#000000"`; set either independently through `config` using six-digit `#RRGGBB` syntax:

```ts
const caveTrack = caveModule.create({
  id: "cave",
  title: "CAVE",
  config: {
    neurotransmitter: "GLU",
    age: "Adolescence",
    topColor: "#d9d9ff",
    bottomColor: "#3333ff",
  },
});
```

Color options affect rendering only and do not trigger another data request. The base track color remains available to the browser shell but is not a fallback for either signal.

## Settings

The dependency-free CAVE settings section provides plain-text **Top color** and **Bottom color** fields. Both keep incomplete drafts editable and commit a valid concrete color on blur or Enter.

## API

### Create input

| Option    | Type         | Default     | Description                                                 |
| --------- | ------------ | ----------- | ----------------------------------------------------------- |
| `id`      | `string`     | Required    | Unique track identifier.                                    |
| `title`   | `string`     | Required    | Track label shown by the browser.                           |
| `display` | `"full"`     | `"full"`    | CAVE's only supported display mode.                         |
| `height`  | `number`     | `35`        | Track height in pixels. Must be positive.                   |
| `color`   | `string`     | `"#3333ff"` | Six-digit hexadecimal base color used by the browser shell. |
| `config`  | `CaveConfig` | Required    | Dataset selection and signal-specific color options.        |

### `CaveConfig`

| Option             | Type                                                                                                      | Default     | Description                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------- |
| `neurotransmitter` | `"GABA" \| "GLU"`                                                                                         | Required    | Selects the neurotransmitter dataset. Changing it requests new data.  |
| `age`              | `"Infancy" \| "Early_Childhood" \| "Late_Childhood" \| "Adolescence" \| "Early_Adulthood" \| "Adulthood"` | Required    | Selects the developmental-age dataset. Changing it requests new data. |
| `topColor`         | `string`                                                                                                  | `"#000000"` | Six-digit hexadecimal fill color for the top hmC signal.              |
| `bottomColor`      | `string`                                                                                                  | `"#000000"` | Six-digit hexadecimal fill color for the bottom OXBS signal.          |

## Interactions

Pass interaction callbacks as the second argument to `caveModule.create`. CAVE emits `onHover` and `onLeave` with a `CaveTooltipItem` containing the rendered `x` position and the available top and bottom signal points. Although the shared interaction type accepts `onClick`, the CAVE renderer does not currently emit click interactions.

## Accessibility

The settings controls have visible labels. The rendered signal exposes hover tooltips through pointer interaction, but it does not currently provide keyboard access or an equivalent textual summary.

## Notes

- CAVE requests package-defined remote datasets for the hg38 assembly. You cannot configure another endpoint or assembly.
- Hover tooltips report the hmC and OXBS values at the pointer position. A missing value is shown as `n/a`.
