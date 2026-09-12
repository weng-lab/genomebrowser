# TrackLabel

Use `TrackLabel` inside a renderer for fixed text annotations with a translucent white background and 10px monospace text.

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

For an interior scale position, use `anchor="left"` or `anchor="right"` with a pixel coordinate:

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

| Prop       | Type                                                                                | Default                         | Description                                                      |
| ---------- | ----------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------- |
| `children` | `string \| number`                                                                  | Required                        | Label text. Numeric formatting belongs to the renderer.          |
| `anchor`   | `"top-left" \| "top-right" \| "bottom-left" \| "bottom-right" \| "left" \| "right"` | Required                        | Edge or corner of the visible plot.                              |
| `y`        | `number`                                                                            | Required for `left` and `right` | Vertical center in plot pixels. Not accepted for corner anchors. |
| `inset`    | `number`                                                                            | `4`                             | Horizontal distance in pixels from the selected plot edge.       |

Labels use a 14px background, clamped vertically inside the plot. Labels are omitted if the plot is shorter than 14px or too narrow to fit the estimated text width and horizontal insets. Each label positions independently; the renderer must select labels that avoid overlap.

## Accessibility

Labels are SVG text with no keyboard interaction. Pointer events pass through to the plot. Provide meaningful text for the values being described.

## Notes

Built on [TrackOverlay](TrackOverlay.md); requires a mounted track renderer and uses visible plot coordinates, not overscanned content coordinates. Corner labels sit against the top or bottom edge. Their values still update when the renderer's data changes.
