# @weng-lab/genomebrowser

A React runtime for displaying interactive genomic tracks.

Create browser and track stores, add track modules, and pass the stores to `GenomeBrowser`. Use first-party modules for common file formats or define custom track types.

## Install

```sh
pnpm add @weng-lab/genomebrowser@2.0.0 @weng-lab/genomebrowser-tracks@2.0.0 react@^19.2.0 react-dom@^19.2.0 @emotion/react@11 @emotion/styled@11 @mui/material@7
```

## Quick start

Create the browser and track stores once, outside component rendering, then pass them to `GenomeBrowser`.

```tsx
import { GenomeBrowser, createBrowserStore, createTrackStore, hg38 } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr1", start: 1_000_000, end: 1_100_000 },
});

const useTrackStore = createTrackStore({
  modules: [bigWigModule],
  tracks: [
    bigWigModule.create({
      base: {
        id: "signal",
        title: "Signal",
      },
      config: {
        url: "YOUR_URL_HERE",
      },
    }),
  ],
});

export function BrowserPage() {
  return <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />;
}
```

Replace `YOUR_URL_HERE` with a BigWig URL accessible from the browser.

Store factory results are Zustand hooks, so their names should begin with `use`. Keep both stores stable. Recreating them during render resets browser state and request coordination.

For a responsive browser that follows its container width, see [Getting started](docs/gettingStarted/firstBrowser.md).

## Optional packages

Start with this package when you need to render or control a genome browser.

Add `@weng-lab/genomebrowser-ui@2.0.0` for controls such as track selection from collections or cytoband navigation. The optional UI package and `GenomeBrowser` can share the same track store.

Add `@weng-lab/genomebrowser-tracks@2.0.0` for the BigBed, BigWig, BulkBed, CAVE, cCRE BigBed, MethylC, and Gene modules. Core does not export first-party track implementations.

## Documentation

- [Documentation overview](docs/README.md). Learning path and topic navigation.
- [Getting started](docs/gettingStarted/firstBrowser.md). Install and render a responsive browser.
- [API reference](docs/reference/README.md). Browser component, viewport store, assemblies, and regions.
- [Troubleshooting](docs/troubleshooting.md). Diagnose setup and runtime problems.

## Runtime requirements

Genome Browser v2 runs in React 19.2+ client applications. It uses SVG, pointer events, and remote data requests. Responsive sizing also requires `ResizeObserver`. Render it on the client rather than on the server.

Coordinate rulers are regular tracks supplied by `@weng-lab/genomebrowser-tracks/ruler`. Add one explicitly if needed. [Region selection modes](docs/gettingStarted/navigationAndSelection.md#select-a-region-by-dragging) work across the browser independently of the ruler.

[Track collections](docs/gettingStarted/trackCollections.md) covers the shared JSON format, validation, and `genomebrowser schema` CLI.
