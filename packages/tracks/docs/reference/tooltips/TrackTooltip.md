# TrackTooltip

Use `TrackTooltip` from `@weng-lab/genomebrowser-tracks/shared` to draw a title and labeled values for a hovered track item.

## Usage

This example replaces the tooltip component on the first-party BigWig module. The tooltip receives the hovered rendered point and current runtime context from core.

```tsx
import { type TrackTooltipComponent } from "@weng-lab/genomebrowser";
import { bigWigModule, type BigWigConfig } from "@weng-lab/genomebrowser-tracks/bigwig";
import {
  TrackTooltip,
  formatSignalValue,
  type SignalPoint,
} from "@weng-lab/genomebrowser-tracks/shared";

const SignalTooltip: TrackTooltipComponent<SignalPoint, BigWigConfig> = ({ item, context }) => (
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

Register `signalModule` with the track store instead of `bigWigModule`. Assign tooltip content to the module's `tooltipComponent`. Serialized track config contains no components.

## API

Import `TrackTooltipProps` and `TrackTooltipRow` from `@weng-lab/genomebrowser-tracks/shared`.

`TrackTooltip` renders an SVG `<g>` and does not forward DOM or SVG props.

| Prop         | Type                         | Default  | Description                                                                                 |
| ------------ | ---------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `title`      | `string`                     | None     | Optional heading rendered above the rows. An empty string is treated as no title.           |
| `titleColor` | `string`                     | None     | Optional CSS color for a square before the title. It has no effect when `title` is absent.  |
| `rows`       | `readonly TrackTooltipRow[]` | Required | Rows rendered in the supplied order. The component does not sort, filter, or format values. |

### `TrackTooltipRow`

| Field   | Type     | Default  | Description                                                                                               |
| ------- | -------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `label` | `string` | Required | Left-column label for the value.                                                                          |
| `value` | `string` | Required | Right-column display value.                                                                               |
| `color` | `string` | None     | Optional CSS color used for the label-area tint and leading mark; it does not replace the label or value. |

## Choose the content

Use the hovered feature or dataset name as the title. Omit the title when the rows identify the item, and avoid repeating it as a row. Put identity or location first, followed by measurements and metadata. Keep channel order stable as values change. Labels should name the value and include units when needed.

Use [formatSignalValue](formatters.md) for measurements whose missing state should remain visible. It returns "No data" for nullish or non-finite input. For optional BED metadata, use `formatOptionalBedValue` and omit the row when it returns `undefined`. Format other values before passing them in; labels and values must be strings.

An empty `rows` array draws a blank box with a minimum height. Supply a row such as `{ label: "Channels", value: "None enabled" }` when there is nothing to list.

### Colors

Use `titleColor` to match the title swatch to the feature. Set a row's `color` when that color identifies its series in the track. The row receives a tinted label background and a solid leading mark. Text must also identify the series so color is not the only distinction.

Colors must be valid CSS strings. Choose them for readable contrast, and omit colors on ordinary metadata. The module supplies these colors; the active MUI theme supplies typography, background, dividers, shape, and text colors.

## Accessibility

The component marks its outer SVG group with `role="tooltip"`. Its title, labels, and values are SVG text, and row color is redundant with that text. The SVG group ignores pointer events and cannot contain interactive tooltip controls.

`TrackTooltip` does not create or label a trigger. It does not add `aria-describedby`, manage focus, or provide keyboard activation. First-party track tooltips appear on pointer hover, so keyboard and screen-reader users may not receive their content. A track renderer is responsible for any other way of exposing the same item details.

## Layout and hosting

Render this component as tooltip content inside the browser SVG. Core measures the group, positions it near the pointer, and keeps it within browser bounds.

Labels and values occupy fixed columns on one line. They do not wrap or truncate, and long labels can collide with values. Keep both short.

First-party data modules already provide tooltip components built with `TrackTooltip`. Those components are not standalone exports. Use `/shared` for `TrackTooltip` and its [formatters](formatters.md) in custom modules.

Return to [Tooltips](README.md) or [Tracks API reference](../README.md).
