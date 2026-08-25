# @weng-lab/genomebrowser-tracks

First-party track modules for `@weng-lab/genomebrowser`. The package includes BigBed, cCRE BigBed, BigWig, BulkBed, CAVE, Gene, MethylC, and Transcript modules. Each one provides its data fetcher, renderer, MUI settings, and SVG tooltip.

The public API may change during the alpha release.

## Install

```sh
npm install @weng-lab/genomebrowser-tracks@alpha @weng-lab/genomebrowser@alpha react@^19.2 react-dom@^19.2 @emotion/react @emotion/styled @mui/material
```

## Minimal browser

```tsx
import { GenomeBrowser, createBrowserStore, createTrackStore, hg38 } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const signalTrack = bigWigModule.create({
  id: "signal",
  title: "Signal",
  config: { url: "YOUR_URL_HERE" },
});

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr1", start: 1_000_000, end: 1_100_000 },
  trackWidth: 900,
});

const useTrackStore = createTrackStore({
  modules: [bigWigModule],
  tracks: [signalTrack],
});

export function BrowserPage() {
  return <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />;
}
```

Replace `YOUR_URL_HERE` with a browser-accessible BigWig URL that supports byte-range requests. See [Getting started](docs/gettingStarted.md) for schema validation and registering all modules.

## Documentation

- [Choose a built-in track](docs/tracks/README.md)
- [Fix data source problems](docs/dataSources.md)
- [Use the module API or author a module](docs/README.md)
