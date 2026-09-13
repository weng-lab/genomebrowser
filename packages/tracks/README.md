# @weng-lab/genomebrowser-tracks

First-party track modules for `@weng-lab/genomebrowser`. The package includes Ruler, BigBed, cCRE BigBed, BigWig, BulkBed, CAVE, Gene, and MethylC modules. Each one provides its data fetcher, renderer, and MUI settings. Data tracks also provide SVG tooltip content.

The public API may change during the beta release.

## Install

```sh
npm install @weng-lab/genomebrowser-tracks@beta @weng-lab/genomebrowser@beta react@^19.2 react-dom@^19.2 @emotion/react @emotion/styled @mui/material
```

## Minimal browser

```tsx
import { GenomeBrowser, createBrowserStore, createTrackStore, hg38 } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const signalTrack = bigWigModule.create({
  base: {
    id: "signal",
    title: "Signal",
  },
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

Replace `YOUR_URL_HERE` with a browser-accessible BigWig URL that supports byte-range requests. See [Getting started](docs/legacy/gettingStarted.md) for schema validation and registering all modules.

## Documentation

- [API reference and public export index](docs/reference/README.md)

- [Choose a built-in track](docs/reference/trackModules/README.md)
- [Fix data source problems](docs/legacy/dataSources.md)
- [Use the module API or author a module](docs/README.md)

See [Ruler and reference sequence](docs/reference/trackModules/ruler.md) for coordinate tracks with optional 2bit DNA.

The package also ships a [collection JSON schema](docs/reference/collectionsAndSchemas/trackCollectionSchema.md) for all first-party tracks, exported as `@weng-lab/genomebrowser-tracks/trackCollection.schema.json`.
