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

The bottom signal uses the track's base `color`, which defaults to `"#3333ff"`. The top signal defaults to a lighter version of the effective bottom color. Override either signal independently through `config`:

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

If you omit `bottomColor`, changing the top-level `color` changes the bottom signal and the derived top signal. If you provide `bottomColor`, it takes precedence over the top-level `color`. An explicit `topColor` always takes precedence over the derived color.

Color options affect rendering only and do not trigger another data request. Automatic lightening supports three- and six-digit hex colors. Provide `topColor` when the effective bottom color uses another CSS color format.

## Settings

The CAVE settings section provides text-based **Top color** and **Bottom color** controls. Clearing a control removes that override and restores its fallback behavior. The browser's base settings still provide the shared track color control; it affects CAVE only when `bottomColor` is not set.

## API

### Create input

| Option    | Type         | Default     | Description                                          |
| --------- | ------------ | ----------- | ---------------------------------------------------- |
| `id`      | `string`     | Required    | Unique track identifier.                             |
| `title`   | `string`     | Required    | Track label shown by the browser.                    |
| `display` | `"full"`     | `"full"`    | CAVE's only supported display mode.                  |
| `height`  | `number`     | `35`        | Track height in pixels. Must be positive.            |
| `color`   | `string`     | `"#3333ff"` | Base track color and fallback for the bottom signal. |
| `config`  | `CaveConfig` | Required    | Dataset selection and signal-specific color options. |

### `CaveConfig`

| Option             | Type                                                                                                      | Default       | Description                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------- |
| `neurotransmitter` | `"GABA" \| "GLU"`                                                                                         | Required      | Selects the neurotransmitter dataset. Changing it requests new data.                            |
| `age`              | `"Infancy" \| "Early_Childhood" \| "Late_Childhood" \| "Adolescence" \| "Early_Adulthood" \| "Adulthood"` | Required      | Selects the developmental-age dataset. Changing it requests new data.                           |
| `topColor`         | `string`                                                                                                  | Derived       | Fill color for the top hmC signal. When omitted, it is derived from the effective bottom color. |
| `bottomColor`      | `string`                                                                                                  | Track `color` | Fill color for the bottom OXBS signal. When omitted, it follows the base track color.           |

## Interactions

Pass interaction callbacks as the second argument to `caveModule.create`. CAVE emits `onHover` and `onLeave` with a `CaveTooltipItem` containing the rendered `x` position and the available top and bottom signal points. Although the shared interaction type accepts `onClick`, the CAVE renderer does not currently emit click interactions.

## Accessibility

The settings controls have visible labels. The rendered signal exposes hover tooltips through pointer interaction, but it does not currently provide keyboard access or an equivalent textual summary.

## Notes

- CAVE requests package-defined remote datasets for the hg38 assembly. You cannot configure another endpoint or assembly.
- Hover tooltips report the hmC and OXBS values at the pointer position. A missing value is shown as `n/a`.
