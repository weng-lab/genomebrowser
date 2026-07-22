# @weng-lab/genomebrowser

A React runtime for displaying interactive genomic tracks.

Genome Browser v2 provides the browser viewport, validated state stores, built-in track modules, and an extension API for custom track types.

> This package is under active development and its public API may change.

## Install

```sh
pnpm add @weng-lab/genomebrowser@2.0.0-alpha.0 react@^19.2 react-dom@^19.2
```

## Quick start

Create the browser and track stores once, outside component rendering, then pass them to `GenomeBrowser`.

```tsx
import {
  GenomeBrowser,
  bigWigModule,
  createBrowserStore,
  createTrackStore,
} from "@weng-lab/genomebrowser";

const useBrowserStore = createBrowserStore({
  region: "chr1:1000000-1100000",
  marginWidth: 120,
  trackWidth: 880,
});

const useTrackStore = createTrackStore({
  modules: [bigWigModule],
  tracks: [
    bigWigModule.create({
      id: "signal",
      title: "Signal",
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

Store factory results are Zustand hooks, so their names should begin with `use`. Keep both stores stable: recreating them during render resets browser state and request coordination.

For a responsive browser that follows its container width, see [Getting started](docs/gettingStarted.md).

## What it provides

- An interactive genomic viewport
- Validated browser and track stores
- Built-in genomic track modules
- Programmatic navigation, highlighting, and track updates
- Request coordination as regions and track configuration change
- An extension API for custom fetch-and-render track modules

## Do you need the UI package?

Start with this package when you need to render or control a genome browser.

Add `@weng-lab/genomebrowser-ui@2.0.0-alpha.0` when you also need ready-made application controls such as catalog-backed track selection or cytoband navigation. The optional UI package and `GenomeBrowser` can share the same track store.

## Documentation

- [Getting started](docs/gettingStarted.md) - installation, stable stores, and responsive sizing
- [Core concepts](docs/concepts.md) - state ownership, requests, and interaction lifetimes
- [Recipes](docs/recipes.md) - common navigation, track, highlight, and sizing tasks
- [Built-in tracks](docs/tracks.md) - available first-party track modules
- [Custom track modules](docs/customTrackModules.md) - create a validated track type
- [Troubleshooting](docs/troubleshooting.md) - diagnose setup, validation, request, and sizing problems

## Runtime requirements

Genome Browser v2 is intended for client-side React 19.2+ applications. It uses browser APIs including SVG, pointer events, remote data requests, and, when implementing responsive sizing, `ResizeObserver`.

It is not a server-rendered visualization runtime.
