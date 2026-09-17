# Track renderers

A module's `render` map assigns an SVG renderer to each display name. Use the supplied data and coordinates to draw one track's content.

## Usage

```tsx
import type { TrackRendererProps } from "@weng-lab/genomebrowser";

type Interval = { start: number; end: number };
type Config = { intervals: Interval[] };

export function IntervalRenderer({
  data,
  region,
  width,
  height,
  color,
}: TrackRendererProps<Config, Interval[]>) {
  const x = (base: number) => ((base - region.start) / (region.end - region.start)) * width;
  return (
    <g>
      {data.map((interval, index) => (
        <rect
          key={index}
          x={x(interval.start)}
          y={0}
          width={Math.max(0, x(interval.end) - x(interval.start))}
          height={height}
          fill={color}
        />
      ))}
    </g>
  );
}
```

Assign this component to a display, such as `render: { full: IntervalRenderer }`, in a matching [module definition](../trackDefinition/defineTrackModule.md). Each region here is expressed in the requested chromosome's coordinates.

## Rendering

`TrackRenderer<Config, Data>` is a React component accepting `TrackRendererProps<Config, Data>`. Render SVG content in the space provided by the track row.

| Prop            | Type            | Default  | Description                                                                |
| --------------- | --------------- | -------- | -------------------------------------------------------------------------- |
| `id`            | `string`        | Required | Track instance ID.                                                         |
| `config`        | `Config`        | Required | Current parsed configuration.                                              |
| `color`         | `string`        | Required | Resolved base color.                                                       |
| `data`          | `Data`          | Required | Fetch result for the displayed render demand.                              |
| `region`        | `GenomicRegion` | Required | Genomic region corresponding to the full render width, including overscan. |
| `visibleRegion` | `GenomicRegion` | Required | Current visible viewport.                                                  |
| `width`         | `number`        | Required | Full render width in logical SVG units.                                    |
| `height`        | `number`        | Required | Track drawing height in logical SVG units.                                 |

Use `region` and `width` together for horizontal positioning. Use `visibleRegion` for calculations based on visible features, such as row count. During a same-scale pan, displayed data may still belong to the previous render region while the next request is in progress. Compare chromosomes when testing feature visibility.

Use [TrackOverlay](TrackOverlay.md) or [TrackLabel](TrackLabel.md) for annotations fixed to the visible plot. The browser supplies row controls and handles clipping and panning.

## Shared zoom selection

Mark an SVG hit area with `data-genomebrowser-selection-mode="zoom"` to start shared zoom selection from pan mode. A primary left-button pointer press inside the data area switches the hosting browser to zoom and starts its full-height preview, drag handling, and cancellation. Core handles the press before track panning or item handlers. Zoom remains active after release or cancellation. Existing zoom and highlight modes keep their selected behavior. Set the hit area's `pointerEvents` and cursor as appropriate for the renderer.

## Context and lifecycle

Core supplies every renderer prop. It mounts the renderer with successful data and shows loading or error content separately. A new display or fetch input can discard the current renderer while replacement data loads. Keep persistent track configuration in the track store.

Use [useGenomeBrowser](../browserSetup/useGenomeBrowser.md) for store access, [useInteraction](useInteraction.md) for item callbacks, [useTooltip](useTooltip.md) for SVG tooltip content, and [useAutoTrackHeight](useAutoTrackHeight.md) when row count determines drawing height. Event handlers belong to your SVG elements; returning a renderer does not automatically make its data keyboard-accessible.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
