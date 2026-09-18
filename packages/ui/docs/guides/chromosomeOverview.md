# Connect a chromosome overview

`Cytobands` draws a complete chromosome with its banding pattern. Pass the browser's current region to show a viewport bracket, and pass highlights to mark regions that users can activate to navigate.

The component receives data and callbacks directly. The application loads the cytoband file, chooses the chromosome length, and subscribes to browser state.

## Load cytoband records

Complete [UI installation](../../README.md#install), then install the reader for this example:

```sh
pnpm add @weng-lab/genomic-reader@2.0.0
```

Load the records with `readCytobands` in the application's data-loading code, then pass them to the overview. Replace `YOUR_URL_HERE` with a browser-accessible UCSC cytoband file for the browser's assembly. The reader accepts plain text and gzip-compressed files.

```ts
import { readCytobands } from "@weng-lab/genomic-reader";

const bands = await readCytobands({ url: "YOUR_URL_HERE" });
```

Use the application's existing loading and error handling around this request.

## Connect the browser state

Create `BrowserOverview.tsx`. The component reads the current region and highlights from the browser store and uses its `setRegion` action to navigate. Chromosome length comes from the browser assembly, which keeps the ideogram's extent consistent even if the file has incomplete band coverage.

```tsx
import type { BrowserStoreInstance } from "@weng-lab/genomebrowser";
import type { Cytoband } from "@weng-lab/genomic-reader";
import { Cytobands } from "@weng-lab/genomebrowser-ui";

export function BrowserOverview({
  browserStore,
  bands,
}: {
  browserStore: BrowserStoreInstance;
  bands: readonly Cytoband[];
}) {
  const useBrowserStore = browserStore;
  const region = useBrowserStore((state) => state.region);
  const chromosomeLength = useBrowserStore(
    (state) => state.assembly.chromosomes[state.region.chromosome],
  );
  const highlights = useBrowserStore((state) => state.highlights);
  const setRegion = useBrowserStore((state) => state.setRegion);

  return (
    <div style={{ maxWidth: "100%", overflowX: "auto" }}>
      <Cytobands
        bands={bands}
        chromosome={region.chromosome}
        chromosomeLength={chromosomeLength}
        width={720}
        height={28}
        currentRegion={region}
        highlights={highlights}
        onHighlightClick={(highlight) => {
          setRegion({
            chromosome: highlight.region.chromosome ?? region.chromosome,
            start: highlight.region.start,
            end: highlight.region.end,
          });
        }}
      />
    </div>
  );
}
```

In the [controls tutorial](../gettingStarted/addBrowserControls.md), import `BrowserOverview` and pass the loaded records with `<BrowserOverview browserStore={useBrowserStore} bands={bands} />` above `GenomeBrowser`. Both receive the same store. Pan or zoom to move the bracket, then add a highlight through the dialog or a browser drag. Activate its ideogram marker to navigate to that region.

`Cytobands` requires numeric width and height props. This example uses a 720-pixel drawing inside a scrollable wrapper. For a fitted overview, measure the available container width with the application's resize utility and pass that width to the component.

## Choose highlights and tooltip content

The example displays browser-store highlights. An application may instead pass its own array of loci without adding them to the browser store. The viewport bracket and highlight overlays are independent.

Coordinates are zero-based and half-open. A highlight without a chromosome uses the displayed chromosome. Highlights on another chromosome do not render. Narrow regions receive a visible marker and a wider pointer target; the bracket itself is non-interactive.

Supplying `onHighlightClick` makes valid highlights keyboard-focusable and activatable with Enter or Space. Pointer hover shows a coordinate tooltip. To display a label supplied by the application, add this prop to the component:

```tsx
renderHighlightTooltip={(highlight) => <text dominantBaseline="hanging">{highlight.id}</text>}
```

Tooltip content must be SVG-compatible, such as `<text>` or `<g>`. HTML and `foreignObject` are not supported. Keyboard focus does not open the tooltip, so keep essential information available through the application's other controls as well.

If tooltip content needs additional data, the application owns loading, caching, errors, and cleanup. The tooltip component mounts only while its highlight is active. See the [Cytobands reference](../reference/chromosomeOverview/Cytobands.md) for tooltip positioning, colors, clipping, and accessibility details.

For missing bands or overlays, see [troubleshooting](../troubleshooting.md#the-chromosome-overview-is-empty).
