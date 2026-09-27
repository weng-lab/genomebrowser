# TrackLabel

Use `TrackLabel` inside a renderer for fixed text annotations with a translucent white background and 10-unit monospace text.

## Usage

```tsx
import { TrackLabel } from "@weng-lab/genomebrowser";

export function RangeLabels() {
  return (
    <>
      <TrackLabel anchor="top-left">8</TrackLabel>
      <TrackLabel anchor="bottom-left">-2</TrackLabel>
    </>
  );
}
```

## Examples

To place a label at a specific height along a plot edge, use `anchor="left"` or `anchor="right"` with a logical SVG coordinate:

```tsx
import { TrackLabel } from "@weng-lab/genomebrowser";

export function DepthLabel({ height }: { height: number }) {
  return (
    <TrackLabel anchor="right" y={height / 2}>
      Depth 0
    </TrackLabel>
  );
}
```

For track errors and status messages, center the label and truncate text that does not fit:

```tsx
import { TrackLabel } from "@weng-lab/genomebrowser";

export function TrackStatus({ message }: { message: string }) {
  return (
    <TrackLabel anchor="center" overflow="truncate">
      {message}
    </TrackLabel>
  );
}
```

The center belongs to the visible plot, excluding the title, margin, and overscan. For a status line above or below other content, supply `y` to keep it in its reserved band. For example, `anchor="center" y={7}` centers a message in a 14-unit band at the top. Coordinates are relative to the whole plot, even when the label is nested inside a translated SVG group.

## API

The props type is `TrackLabelProps`.

| Prop       | Type                                                                                            | Default                                                     | Description                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `children` | `string \| number`                                                                              | Required                                                    | Label text. Numeric formatting belongs to the renderer.                                         |
| `anchor`   | `"top-left" \| "top-right" \| "bottom-left" \| "bottom-right" \| "left" \| "right" \| "center"` | Required                                                    | Edge, corner, or center of the visible plot.                                                    |
| `y`        | `number`                                                                                        | Required for `left` and `right`; plot midpoint for `center` | Vertical center in logical SVG units. Optional for `center`. Not accepted for corner anchors.   |
| `inset`    | `number`                                                                                        | `4`                                                         | Horizontal edge spacing in logical SVG units; reserves space on both sides for centered labels. |
| `overflow` | `"hide" \| "truncate"`                                                                          | `"hide"`                                                    | Omit oversized labels or shorten them with an ellipsis.                                         |

Labels use a 14-unit background, clamped vertically inside the plot. Truncatable labels scale down their background and font in shorter tracks. With `overflow="hide"`, labels are omitted when their estimated text width and horizontal insets do not fit. With `overflow="truncate"`, labels shorten to fit and end with an ellipsis. The full text is retained in an SVG `<title>` and the text element's accessible name when truncated. Hidden-overflow labels are omitted in plots shorter than 14 units. Both modes omit labels if there is no height or the plot cannot fit one character plus padding and insets. A non-finite `y` omits the label. Dimensions scale with the browser SVG. Each label positions independently; the renderer must select labels that avoid overlap.

## Accessibility

Labels are SVG text with no keyboard interaction. Ordinary labels let pointer events pass through to the plot. Truncated labels receive hover events for the native SVG title tooltip; their pointer events still bubble to the plot so dragging can start on the message. The full text is available as the accessible name, but labels are not focusable or scrollable. Provide meaningful text for the values being described.

## Notes

`TrackLabel` uses [TrackOverlay](TrackOverlay.md) and requires a mounted track renderer. Its coordinates refer to the visible plot rather than the content retained outside the viewport for panning. Corner labels sit against the top or bottom edge. Their values still update when the renderer's data changes.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
