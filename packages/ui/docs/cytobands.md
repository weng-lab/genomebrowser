# Cytobands

`Cytobands` fetches and renders one complete chromosome ideogram. Use application highlights for loci and pass the browser viewport separately as a `currentRegion` bracket.

## Usage

```tsx
import { Cytobands } from "@weng-lab/genomebrowser-ui";

export function ChromosomeOverview() {
  return <Cytobands assembly="GRCh38" chromosome="chr6" width={720} height={28} />;
}
```

Cytobands defaults to the same-origin `/api/screen-graphql` route. The host application must implement that route or provide a different `endpoint`. For authenticated SCREEN access, use a server proxy that adds the credential server-side. Cytobands never reads or sends an API key.

## Browser region and loci

`currentRegion` accepts the complete `BrowserRegion` from a v2 browser store without adaptation. It is independent from `highlights`, so browser navigation moves the blue bracket without changing application loci or refetching cytobands.

```tsx
import { Cytobands } from "@weng-lab/genomebrowser-ui";
import { createBrowserStore, type Highlight } from "@weng-lab/genomebrowser";

const useBrowserStore = createBrowserStore({
  region: "chr6:20,000,000-23,000,000",
  trackWidth: 900,
});

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

export function BrowserIdeogram() {
  const region = useBrowserStore((state) => state.region);
  const setRegion = useBrowserStore((state) => state.setRegion);

  return (
    <Cytobands
      assembly="GRCh38"
      chromosome={region.chromosome}
      currentRegion={region}
      width={720}
      height={28}
      highlights={loci}
      onHighlightClick={(highlight) => {
        setRegion({
          chromosome: highlight.region.chromosome ?? region.chromosome,
          start: highlight.region.start,
          end: highlight.region.end,
        });
      }}
    />
  );
}
```

A highlight without `region.chromosome` inherits the displayed chromosome. An explicit matching chromosome renders; a different chromosome is filtered out. Valid intervals are clipped to the fetched chromosome extent. Empty, reversed, non-integer, non-finite, or entirely out-of-range intervals do not render. Narrow loci receive a visible marker and a wider transparent pointer target; wide loci render as interval overlays. Overlaps render deterministically by coordinates and stable `id`.

The current-region bracket is separate, non-interactive, and drawn after application highlights. It renders only for a valid region on the displayed chromosome, clips partial overlap, and gives tiny regions a minimum visible width centered on their genomic position.

## Application-owned tooltip data

Every rendered highlight has a pointer-hover tooltip. By default it shows the effective chromosome and formatted input start/end coordinates. `renderHighlightTooltip` replaces that content and runs only for the currently pointer-hovered highlight. Its content unmounts when the pointer leaves, a click occurs, focus reaches the highlight, the pointer moves to another highlight, or the active highlight stops rendering.

Keep application-specific data outside `Highlight`. Use its stable ID or coordinates to look up or load data in a tooltip component:

```tsx
import { useEffect, useState } from "react";
import { Cytobands } from "@weng-lab/genomebrowser-ui";
import type { Highlight } from "@weng-lab/genomebrowser";

const labels: Readonly<Record<string, string>> = {
  "broad-locus": "MHC-associated locus",
  "fine-mapped-locus": "Fine-mapped locus",
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

export function InteractiveIdeogram({ highlights }: { highlights: readonly Highlight[] }) {
  return (
    <Cytobands
      assembly="GRCh38"
      chromosome="chr6"
      width={720}
      height={28}
      highlights={highlights}
      renderHighlightTooltip={(highlight) => <LocusTooltip highlight={highlight} />}
    />
  );
}
```

The tooltip is SVG-only: return SVG-compatible content such as `<text>` or `<g>`, not HTML or `foreignObject`. The application owns lookup caching, loading and error states, authentication, and cleanup of asynchronous work. Because inactive tooltip content is not mounted, placing a request in the tooltip component starts it only while that highlight is active.

## Fetching and endpoints

`GRCh38`, `GRCH38`, and `hg38` are sent to the GraphQL resolver as `hg38`; other assembly strings are sent unchanged. The response must contain bands for the requested chromosome. The component derives the complete chromosome extent from all valid returned bands and safely renders standard negative, positive-intensity, variable, stalk, and centromere stains. Unknown stains use the `unknown` color.

Requests use native `fetch` and are keyed by the exact `endpoint`, `assembly`, and `chromosome` props. Changes to dimensions, colors, regions, highlights, callbacks, or tooltip content do not refetch. Completed request identities can be reused from a bounded in-memory cache, and obsolete in-flight requests are released so stale results cannot replace current data.

When the host does not implement `/api/screen-graphql`, pass its GraphQL proxy URL through `endpoint`:

```tsx
import { Cytobands } from "@weng-lab/genomebrowser-ui";

<Cytobands assembly="GRCh38" chromosome="chr6" endpoint="YOUR_URL_HERE" width={720} height={28} />;
```

The proxy must accept the component's GraphQL POST and provide any required authentication itself. The UI package does not read a service key or construct an authorization header. The browser's normal `fetch` credential behavior still applies, including same-origin cookies. An application may point its Apollo client at the same proxy, but Cytobands uses native `fetch` and does not require an Apollo provider.

Loading, empty, network, GraphQL, and malformed-response states render text inside an SVG with the requested dimensions and expose a polite live status. Long status text may overflow a narrow width.

## API

### `CytobandsProps`

| Prop                      | Type                                  | Default               | Description                                                                                                                                                                               |
| ------------------------- | ------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assembly`                | `string`                              | Required              | Assembly sent to the cytoband query. Supported GRCh38 aliases normalize to `hg38` on the GraphQL wire.                                                                                    |
| `chromosome`              | `string`                              | Required              | Chromosome queried and displayed.                                                                                                                                                         |
| `width`                   | `number`                              | Required              | SVG width and horizontal coordinate space. Non-finite or negative values render as `0`.                                                                                                   |
| `height`                  | `number`                              | Required              | SVG height. Non-finite or negative values render as `0`.                                                                                                                                  |
| `endpoint`                | `string`                              | `/api/screen-graphql` | Host-owned GraphQL POST destination. Cytobands does not construct an authorization header.                                                                                                |
| `colors`                  | `Partial<CytobandColors>`             | See below             | Overrides one or more cytoband stain colors.                                                                                                                                              |
| `highlights`              | `readonly Highlight[]`                | `[]`                  | V2 application loci. Each requires a stable `id`, genomic interval, and color; omitted opacity renders as `0.2`.                                                                          |
| `currentRegion`           | `BrowserRegion`                       | None                  | Separate v2 browser viewport rendered as a non-interactive blue bracket. It does not alter highlights or request identity.                                                                |
| `renderHighlightTooltip`  | `(highlight: Highlight) => ReactNode` | Coordinate tooltip    | Returns SVG-compatible content for the currently pointer-hovered highlight only.                                                                                                          |
| `onHighlightClick`        | `(highlight, event) => void`          | None                  | Runs for a pointer click or non-repeated Enter/Space activation. The event is a React SVG-group mouse or keyboard event. Supplying it makes rendered highlights buttons in the tab order. |
| `onHighlightPointerEnter` | `(highlight, event) => void`          | None                  | Runs when the pointer enters a rendered highlight's SVG group.                                                                                                                            |
| `onHighlightPointerLeave` | `(highlight, event) => void`          | None                  | Runs when the pointer leaves a rendered highlight's SVG group.                                                                                                                            |

`Cytobands` does not forward native SVG attributes.

### `CytobandColors`

| Field        | Type     | Default   | Description                                                 |
| ------------ | -------- | --------- | ----------------------------------------------------------- |
| `negative`   | `string` | `#ffffff` | Negative (`gneg`) bands.                                    |
| `positive`   | `string` | `#111111` | Positive (`gpos*`) bands; stain intensity controls opacity. |
| `variable`   | `string` | `#8c8c8c` | Variable (`gvar`) bands.                                    |
| `stalk`      | `string` | `#d95f5f` | Stalk bands.                                                |
| `centromere` | `string` | `#9e2a2b` | Centromere (`acen`) bands.                                  |
| `unknown`    | `string` | `#b8b8b8` | Unrecognized stain values.                                  |

`Highlight` and `BrowserRegion` are public runtime types, not UI-package-specific copies. A `Highlight` contains `id`, `region: { chromosome?: string; start: number; end: number }`, `color`, and optional `opacity`. A `BrowserRegion` contains required `chromosome`, `start`, and `end` fields. Highlight opacity accepts `0` through `1`; explicit `0`, fractional values, and `1` are preserved.

## Accessibility

The ideogram SVG has an accessible chromosome label. Without clickable highlights or a current-region bracket it is an image; otherwise it groups its separately labeled content. The current-region bracket has a coordinate label, ignores pointer events, and is not focusable.

When `onHighlightClick` is supplied, each valid highlight has `role="button"`, an accessible coordinate name, and `tabIndex={0}`. Enter and Space call the same callback as pointer activation; repeated keydown events are ignored. Wide and narrow loci share these semantics and callbacks. Without `onHighlightClick`, highlights are not keyboard-focusable buttons.

Visual tooltips are pointer-hover-only. Keyboard focus does not open one and closes an open tooltip; pointer leave and click also close it. Tooltip content itself ignores pointer events. The tooltip is visual context rather than a focus-triggered accessible description; each highlight's coordinate label remains its accessible name.

## Notes

- Cytobands renders one complete chromosome, not a multi-chromosome track or the browser's current domain.
- It does not own or subscribe to a browser store. The caller selects and passes `currentRegion`.
- It does not require a GenomeBrowser, track store, Apollo provider, or application tooltip-data API.
- Cytoband bands, highlights, and the current-region bracket are clipped to the fetched chromosome extent. Tooltip SVG may extend below the requested ideogram height so it remains visible.
- Highlight tooltips use an opaque neutral background so cytoband geometry cannot show through their text.
- Cytobands does not impose positioning or z-index on its SVG. When multiple ideograms are stacked closely enough for tooltips to overlap later rows, the host should raise the hovered row in its own stacking context.
- Overlapping pointer targets follow deterministic SVG paint order; the later rendered target receives pointer input where targets overlap.
