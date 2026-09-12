# TrackOverlay

Use `TrackOverlay` inside a track renderer to draw SVG content that stays fixed in the visible plot during horizontal panning. The overlay moves vertically with its track and is clipped to the plot.

## Usage

```tsx
import { TrackOverlay } from "@weng-lab/genomebrowser";

export function Legend() {
  return (
    <TrackOverlay>
      {({ width }) => (
        <text x={width - 8} y={16} textAnchor="end">
          Signal
        </text>
      )}
    </TrackOverlay>
  );
}
```

## API

| Prop       | Type                                                                    | Default  | Description                                                                 |
| ---------- | ----------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| `children` | `ReactNode \| ((size: { width: number; height: number }) => ReactNode)` | Required | SVG content, or a function receiving the visible plot dimensions in pixels. |

The origin is the top-left of the visible plot, below the title and outside the margin. Width excludes overscan. Children retain their renderer's React context through a portal and draw above the panning content. No React update is needed for each drag movement.

## Accessibility

The wrapper uses `pointer-events="none"` so annotations do not obstruct plot interactions. SVG children can explicitly override this; interactive content must provide its own accessible behavior. The overlay supplies no accessible name or keyboard interaction.

## Notes

Requires a mounted track frame in `GenomeBrowser`. Renders nothing outside that context or before the overlay target mounts. It is a client-side rendering feature. For styled text annotations, use [TrackLabel](TrackLabel.md).
