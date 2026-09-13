# Coordinate conversion

Convert genomic positions or viewport pointer coordinates into track-space X coordinates.

## Usage

```ts
import { createGenomicXScale, clientXToTrackX } from "@weng-lab/genomebrowser-tracks/shared";

const scale = createGenomicXScale({ chromosome: "chr1", start: 100, end: 200 }, 500);
scale(150); // 250
clientXToTrackX(300, { left: 50, width: 1000 }, 500); // 125
```

## API

`createGenomicXScale(region, width)` returns an unclamped linear function. It maps `region.start` to `0` and `region.end` to `width`. Positions outside the region extrapolate beyond those pixel endpoints.

`clientXToTrackX(clientX, bounds, trackWidth)` converts a viewport client coordinate into track space. It returns `0` when `bounds.width` is zero or negative. Otherwise, it applies `((clientX - bounds.left) / bounds.width) * trackWidth` without clamping.

| Export                | Type                                                                                                 | Description                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `createGenomicXScale` | `(region: GenomicRegion, width: number) => (position: number) => number`                             | Creates an unclamped genomic-to-track pixel scale. |
| `clientXToTrackX`     | `(clientX: number, bounds: Readonly<{ left: number; width: number }>, trackWidth: number) => number` | Converts a client X coordinate into track space.   |

Supply finite coordinates and widths, and a genomic region with positive span. The functions do not validate these inputs. Coordinate conversion does not navigate the browser or change track state.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
