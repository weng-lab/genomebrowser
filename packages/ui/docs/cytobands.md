# Cytobands

`Cytobands` renders one complete chromosome ideogram from data supplied by the
application. Use `readCytobands` from `@weng-lab/genomic-reader` (or another
application data source) to load the records, then pass the records and the
chromosome length to this component.

## Usage

The application owns loading and error UI, and the source URL. This
example keeps the request outside `Cytobands` and passes ready data through its
data-only props:

```tsx
import { useEffect, useState } from "react";
import { Cytobands } from "@weng-lab/genomebrowser-ui";
import { readCytobands, type Cytoband } from "@weng-lab/genomic-reader";

const chromosome = "chr6";
const cytobandUrl = "YOUR_URL_HERE";

type CytobandState =
  | { status: "loading" }
  | { status: "ready"; bands: readonly Cytoband[] }
  | { status: "error"; message: string };

function useCytobands(): CytobandState {
  const [state, setState] = useState<CytobandState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    void readCytobands({ url: cytobandUrl, signal: controller.signal }).then(
      (bands) => setState({ status: "ready", bands }),
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Unable to load cytobands",
          });
        }
      },
    );
    return () => controller.abort();
  }, []);

  return state;
}

export function ChromosomeOverview() {
  const state = useCytobands();

  if (state.status === "loading") return <p>Loading cytobands…</p>;
  if (state.status === "error") return <p role="alert">{state.message}</p>;

  const chromosomeLength = state.bands.reduce(
    (length, band) => (band.chromosome === chromosome ? Math.max(length, band.end) : length),
    0,
  );
  if (chromosomeLength === 0) return <p>No cytobands found for {chromosome}.</p>;

  return (
    <Cytobands
      bands={state.bands}
      chromosome={chromosome}
      chromosomeLength={chromosomeLength}
      height={28}
      width={720}
    />
  );
}
```

Replace `YOUR_URL_HERE` with a browser-accessible UCSC cytoband file URL. The
reader accepts plain UTF-8 and gzip-compressed files. A complete file lets the
example derive the displayed chromosome length from its largest band end; an
application can instead pass a known chromosome length from its assembly data.

`Cytobands` does not fetch data and does not render a loading or error state.
The caller decides whether to render the component only after data is ready.
`bands` may contain records for multiple chromosomes; the component renders
only records whose `chromosome` matches the `chromosome` prop.

## Browser region and loci

`currentRegion` is an optional browser viewport bracket. It is independent from
`highlights`, so changing the browser region does not change application loci
or the supplied cytoband data.

```tsx
import { useState } from "react";
import { Cytobands } from "@weng-lab/genomebrowser-ui";
import type { GenomicRegion, Highlight } from "@weng-lab/genomebrowser";
import type { Cytoband } from "@weng-lab/genomic-reader";

const region: GenomicRegion = {
  chromosome: "chr6",
  start: 20_000_000,
  end: 23_000_000,
};

const loci: readonly Highlight[] = [
  {
    id: "broad-locus",
    region: { chromosome: "chr6", start: 43_250_000, end: 48_250_000 },
    color: "#ef6c00",
  },
  {
    id: "fine-mapped-locus",
    region: { start: 159_942_570, end: 159_945_884 },
    color: "#ff9800",
    opacity: 0.8,
  },
];

export function BrowserIdeogram({ bands }: { bands: readonly Cytoband[] }) {
  const [currentRegion, setCurrentRegion] = useState(region);

  return (
    <Cytobands
      bands={bands}
      chromosome="chr6"
      chromosomeLength={170_805_979}
      currentRegion={currentRegion}
      highlights={loci}
      height={28}
      width={720}
      onHighlightClick={(highlight) => {
        setCurrentRegion((current) => ({
          chromosome: highlight.region.chromosome ?? current.chromosome,
          start: highlight.region.start,
          end: highlight.region.end,
        }));
      }}
    />
  );
}
```

`GenomicRegion` uses zero-based, half-open coordinates. A highlight without a
`region.chromosome` uses the displayed chromosome. Highlights on another
chromosome, invalid intervals, and intervals outside the chromosome extent do
not render. Valid intervals are clipped to the extent. Narrow loci receive a
visible marker and a wider pointer target; wider loci render as interval
overlays. Overlapping loci use deterministic coordinate and ID ordering.

The current-region bracket is non-interactive and renders after highlights. It
appears only for a valid region on the displayed chromosome, clips partial
overlap, and gives very small regions a minimum visible width centered on their
genomic position.

## Application-owned tooltip data

Rendered highlights show a coordinate tooltip on pointer hover. Clickable
highlights also show it on keyboard focus. Use `renderHighlightTooltip` to
replace it with SVG-compatible content. The application owns any lookup,
caching, loading, error, authentication, and cleanup logic for
application-specific tooltip data:

```tsx
import { useEffect, useState } from "react";
import { Cytobands } from "@weng-lab/genomebrowser-ui";
import type { Highlight } from "@weng-lab/genomebrowser";
import type { Cytoband } from "@weng-lab/genomic-reader";

const labels: Readonly<Record<string, string>> = {
  "broad-locus": "MHC-associated locus",
};

function LocusTooltip({ highlight }: { highlight: Highlight }) {
  const [label, setLabel] = useState<string>();

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) setLabel(labels[highlight.id] ?? "No annotation");
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [highlight.id]);

  return <text dominantBaseline="hanging">{label ?? "Loading annotation…"}</text>;
}

export function InteractiveIdeogram({
  bands,
  highlights,
}: {
  bands: readonly Cytoband[];
  highlights: readonly Highlight[];
}) {
  return (
    <Cytobands
      bands={bands}
      chromosome="chr6"
      chromosomeLength={170_805_979}
      height={28}
      highlights={highlights}
      renderHighlightTooltip={(highlight) => <LocusTooltip highlight={highlight} />}
      width={720}
    />
  );
}
```

The tooltip is SVG-only: return SVG-compatible content such as `<text>` or
`<g>`, not HTML or `foreignObject`. `Cytobands` measures the rendered SVG
content and updates the tooltip size when that content changes.

The active tooltip renders in a fixed, viewport-sized SVG portal under
`document.body`, rather than inside the ideogram SVG. Pointer tooltips start
beside the position from the pointer-enter event. Keyboard tooltips use the
focused highlight's viewport bounds. Near the right or bottom viewport edge,
the tooltip flips to the other side of its anchor, then clamps to the viewport
margin. Content that is wider or taller than the available viewport area is
clipped inside the bounded shell rather than extending beyond that margin.
Custom SVG content does not wrap automatically.

The portal ignores pointer events. Paper, divider, and text colors use the
active MUI theme's CSS-variable-aware palette tokens when available. Caption
typography, shape, and the tooltip z-index also come from the active theme.

Tooltip content is mounted only for the active highlight, so a request in the
tooltip component runs only while that highlight is active. Pointer leave
closes a pointer-owned tooltip. Blur or Escape closes a keyboard-owned
tooltip, and click or keyboard activation also dismisses it. Switching
highlights, removing the active highlight, and unmounting `Cytobands` remove
the portal content and its observers.

## Data and rendering

`bands` uses the public `Cytoband` type from `@weng-lab/genomic-reader`:

- `chromosome`, `start`, and `end` identify a zero-based, half-open interval.
- `name` is the band name.
- `stain` is preserved from the source file and controls the default rendering.

The component safely renders negative, positive-intensity, variable, stalk,
and centromere stains. Unknown stains use the `unknown` color. It filters
records to the displayed chromosome, removes invalid or out-of-range
intervals, clips partial overlap, and sorts the rendered records
deterministically. `chromosomeLength` defines the full horizontal genomic
extent and must be a positive finite number for bands or overlays to render.

Changing dimensions, colors, regions, bands, highlights, or callbacks updates
the rendered SVG synchronously; `Cytobands` makes no network request.

## API

### `CytobandsProps`

| Prop                      | Type                                                                                                     | Default            | Description                                                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `chromosome`              | `string`                                                                                                 | Required           | Chromosome to display and to select from `bands`.                                                                                        |
| `chromosomeLength`        | `number`                                                                                                 | Required           | Full genomic length represented by the ideogram. Non-finite or non-positive values render an empty genomic extent.                       |
| `bands`                   | `readonly Cytoband[]`                                                                                    | Required           | Cytoband records to render; records for other chromosomes are ignored.                                                                   |
| `width`                   | `number`                                                                                                 | Required           | SVG width and horizontal coordinate space. Non-finite or negative values render as `0`.                                                  |
| `height`                  | `number`                                                                                                 | Required           | SVG height. Non-finite or negative values render as `0`.                                                                                 |
| `colors`                  | `Partial<CytobandColors>`                                                                                | `undefined`        | Overrides one or more stain colors.                                                                                                      |
| `highlights`              | `readonly Highlight[]`                                                                                   | `[]`               | Application loci to overlay. Missing opacity renders as `0.2`.                                                                           |
| `currentRegion`           | `GenomicRegion`                                                                                          | `undefined`        | Browser viewport rendered as a separate, non-interactive blue bracket.                                                                   |
| `renderHighlightTooltip`  | `(highlight: Highlight) => ReactNode`                                                                    | Coordinate tooltip | Returns SVG-compatible content for the fixed viewport tooltip shown for the active pointer-hovered or keyboard-focused highlight.        |
| `onHighlightClick`        | `(highlight: Highlight, event: ReactMouseEvent<SVGGElement> \| ReactKeyboardEvent<SVGGElement>) => void` | `undefined`        | Runs for a pointer click or non-repeated Enter/Space activation. Supplying it gives valid highlights `role="button"` and keyboard focus. |
| `onHighlightPointerEnter` | `(highlight: Highlight, event: ReactPointerEvent<SVGGElement>) => void`                                  | `undefined`        | Runs when the pointer enters a rendered highlight group.                                                                                 |
| `onHighlightPointerLeave` | `(highlight: Highlight, event: ReactPointerEvent<SVGGElement>) => void`                                  | `undefined`        | Runs when the pointer leaves a rendered highlight group.                                                                                 |

`Cytobands` does not forward native SVG attributes. `Highlight` and
`GenomicRegion` are public types from `@weng-lab/genomebrowser`; `Cytoband` and
`CytobandColors` are public types from their respective packages.

### `CytobandColors`

| Field        | Type     | Default   | Description                                                 |
| ------------ | -------- | --------- | ----------------------------------------------------------- |
| `negative`   | `string` | `#ffffff` | Negative (`gneg`) bands.                                    |
| `positive`   | `string` | `#111111` | Positive (`gpos*`) bands; stain intensity controls opacity. |
| `variable`   | `string` | `#8c8c8c` | Variable (`gvar`) bands.                                    |
| `stalk`      | `string` | `#d95f5f` | Stalk bands.                                                |
| `centromere` | `string` | `#9e2a2b` | Centromere (`acen`) bands.                                  |
| `unknown`    | `string` | `#b8b8b8` | Unrecognized stain values.                                  |

## Accessibility

The ideogram SVG has an accessible chromosome label. Without clickable
highlights or a current-region bracket it is an image; otherwise it groups its
separately labeled content. The current-region bracket has a coordinate label,
ignores pointer events, and is not focusable.

When `onHighlightClick` is supplied, each valid highlight has `role="button"`,
an accessible coordinate name, and `tabIndex={0}`. Enter and Space call the
same callback as pointer activation; repeated keydown events are ignored.
Without `onHighlightClick`, highlights are not keyboard-focusable buttons.

Pointer hover opens a tooltip for any rendered highlight. Keyboard focus opens
one only when `onHighlightClick` makes the highlight interactive. While the
tooltip is visible, the active highlight references its stable tooltip ID with
`aria-describedby`. Blur, Escape, click, and keyboard activation dismiss a
keyboard tooltip. Pointer leave dismisses a pointer tooltip. Tooltip content
and its viewport portal ignore pointer events; each highlight's coordinate
label remains its accessible name.

## Notes

- `Cytobands` renders one complete chromosome, not a multi-chromosome track or the browser's current domain.
- It does not own or subscribe to a browser store. The caller selects and passes `currentRegion`.
- It does not require a `GenomeBrowser`, track store, Apollo provider, or application tooltip-data API.
- Cytoband bands, highlights, and the current-region bracket are clipped to the supplied chromosome extent. The tooltip portal is independent of the ideogram bounds and stacking context.
- The active tooltip requires a browser document. Server rendering emits the ideogram without tooltip portal content.
- Overlapping pointer targets follow deterministic SVG paint order; the later rendered target receives pointer input where targets overlap.
