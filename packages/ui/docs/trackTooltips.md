# Author track tooltips

Use `TrackTooltip` from `@weng-lab/genomebrowser-ui` to present compact, theme-aware rows for a track module's hovered item. The core browser owns tooltip activation, positioning, visibility, and the `item` and runtime `context`; the module owns which content appears; the UI component owns only the SVG surface.

## Usage

This example replaces the tooltip component on the core BigWig module. The tooltip receives the hovered rendered point and current runtime context from core.

```tsx
import {
  bigWigModule,
  type BigWigConfig,
  type RenderedBigWigPoint,
  type TrackTooltipComponent,
} from "@weng-lab/genomebrowser";
import { TrackTooltip, formatSignalValue } from "@weng-lab/genomebrowser-ui";

const SignalTooltip: TrackTooltipComponent<RenderedBigWigPoint, BigWigConfig> = ({
  item,
  context,
}) => (
  <TrackTooltip
    rows={[
      {
        label: "Signal",
        value: formatSignalValue(item.max),
        color: context.base.color,
      },
    ]}
  />
);

export const signalModule = {
  ...bigWigModule,
  tooltipComponent: SignalTooltip,
} satisfies typeof bigWigModule;
```

Register `signalModule` with the track store instead of `bigWigModule`. A tooltip belongs on the module's `tooltipComponent`; it is not track configuration or per-track serialized data.

## Content conventions

### Titles and row order

- Use `title` for the hovered feature, transcript, or dataset name when that identity helps orient the reader. Omit it when the rows are self-explanatory, and do not repeat the title as a row.
- Supply rows in a stable, meaningful order. Put primary identity or location first, followed by measurements and supporting metadata. Keep configured channel rows in their domain order rather than sorting by value.
- Keep labels brief and specific. Include units in a label when the value would otherwise be ambiguous.
- Do not pass an empty row list. When there is nothing to list, provide an explicit state such as `{ label: "Channels", value: "None enabled" }`.

### Missing and optional data

Use `formatSignalValue` for a measurement that should remain visible even when its data is missing. It produces the shared `"No data"` value for nullish or non-finite input, so a configured row can keep its position as the pointer moves.

Use `formatOptionalBedValue` for optional BED metadata. It returns `undefined` for blank strings, `"."`, and non-finite numbers; omit the corresponding row in that case. Do not use it for a measurement whose missing state needs to be explicit.

When no helper matches the domain, format the value before passing it to `TrackTooltip`. Both row labels and values must be strings.

### Colors

Set a row's `color` only when the color already identifies that series or channel in the track. The component adds a tinted label background and a solid leading mark; the visible label and value still communicate the row without color. Omit `color` for ordinary metadata and interface decoration. The value must be a valid CSS color string, and the host browser determines its rendered contrast.

## `TrackTooltip` API

`TrackTooltip` renders an SVG `<g>` and does not forward DOM or SVG props.

| Prop    | Type                         | Default  | Description                                                                                 |
| ------- | ---------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `title` | `string`                     | None     | Optional heading rendered above the rows. An empty string is treated as no title.           |
| `rows`  | `readonly TrackTooltipRow[]` | Required | Rows rendered in the supplied order. The component does not sort, filter, or format values. |

### `TrackTooltipRow`

| Field   | Type     | Default  | Description                                                                                               |
| ------- | -------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `label` | `string` | Required | Left-column label for the value.                                                                          |
| `value` | `string` | Required | Right-column display value.                                                                               |
| `color` | `string` | None     | Optional CSS color used for the label-area tint and leading mark; it does not replace the label or value. |

## Formatter API

All three helpers use the `en-US` locale for deterministic grouping and decimal separators.

| Function                 | Signature                                                       | Behavior                                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formatSignalValue`      | `(value: number \| null \| undefined) => string`                | Formats finite numbers with exactly two decimal places and grouping. Returns `"No data"` for `null`, `undefined`, `NaN`, and infinities.                      |
| `formatOptionalBedValue` | `(value: number \| string \| undefined) => string \| undefined` | Formats finite numbers with at most two decimal places. Trims strings and returns `undefined` for a blank string, `"."`, `undefined`, or a non-finite number. |
| `formatGenomicInterval`  | `(start: number, end: number, chromosome?: string) => string`   | Groups coordinates with no displayed fractional digits and joins them with an en dash. When supplied, the chromosome is prefixed as `chromosome:start–end`.   |

`formatGenomicInterval` only formats its inputs. It does not validate chromosome names, coordinate bounds, interval direction, or whether your data uses zero-based or one-based coordinates.

## Accessibility

The component marks its outer SVG group with `role="tooltip"`. Its title, labels, and values are SVG text, and row color is redundant with that text. The surface ignores pointer events and cannot contain interactive tooltip controls.

`TrackTooltip` does not create or label a trigger, add `aria-describedby`, manage focus, or add keyboard activation. Core's built-in track tooltips are shown by pointer hover, so the tooltip content is not guaranteed to be announced to keyboard or screen-reader users. If your track renderer adds another way to expose the same item details, that behavior remains the renderer's responsibility.

## Notes

- Render `TrackTooltip` only as tooltip content inside the browser SVG. Core measures and positions the resulting SVG group near the pointer and keeps it within the browser bounds.
- The component uses the active MUI theme for typography, surface, divider, shape, and text colors. Scientific row colors remain module data.
- Labels and values use fixed columns and one line of SVG text. They do not wrap or truncate, and long labels can collide with values. Keep tooltip content compact.
- An empty `rows` array produces a blank minimum-height surface; author an explicit empty-state row instead.

## Built-in tooltip components

The package exports `BigWigTooltip`, `BigBedTooltip`, `BulkBedTooltip`, `CaveTooltip`, `MethylCTooltip`, and `TranscriptTooltip` for the matching core modules. Assign one to the matching module's `tooltipComponent` when its built-in content fits your application. All six compose `TrackTooltip` and follow the conventions on this page.
