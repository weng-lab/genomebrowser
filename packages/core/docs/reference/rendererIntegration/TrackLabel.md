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

## API

The props type is `TrackLabelProps`.

| Prop       | Type                                                                                | Default                         | Description                                                            |
| ---------- | ----------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| `children` | `string \| number`                                                                  | Required                        | Label text. Numeric formatting belongs to the renderer.                |
| `anchor`   | `"top-left" \| "top-right" \| "bottom-left" \| "bottom-right" \| "left" \| "right"` | Required                        | Edge or corner of the visible plot.                                    |
| `y`        | `number`                                                                            | Required for `left` and `right` | Vertical center in logical SVG units. Not accepted for corner anchors. |
| `inset`    | `number`                                                                            | `4`                             | Horizontal distance in logical SVG units from the selected plot edge.  |

Labels use a 14-unit background, clamped vertically inside the plot. Labels are omitted if the plot is shorter than 14 units or too narrow to fit the estimated text width and horizontal insets. A non-finite `y` omits the label. Dimensions scale with the browser SVG. Each label positions independently; the renderer must select labels that avoid overlap.

## Accessibility

Labels are SVG text with no keyboard interaction. Pointer events pass through to the plot. Provide meaningful text for the values being described.

## Notes

Built on [TrackOverlay](TrackOverlay.md); requires a mounted track renderer and uses visible plot coordinates, not overscanned content coordinates. Corner labels sit against the top or bottom edge. Their values still update when the renderer's data changes.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
