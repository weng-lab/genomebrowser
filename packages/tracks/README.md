# @weng-lab/genomebrowser-tracks

First-party track modules for displaying genomic data with `@weng-lab/genomebrowser`.

Choose a module for your data source and register it with core's track store. Each module supplies data fetching, rendering, and settings. Data tracks also include tooltips.

## Install

```sh
pnpm add @weng-lab/genomebrowser-tracks@2.0.0 @weng-lab/genomebrowser@2.0.0 react@^19.2.0 react-dom@^19.2.0 @emotion/react@11 @emotion/styled@11 @mui/material@7
```

Use React and React DOM 19.2 or later, Emotion 11, and MUI 7. Render the browser in a client application. Settings forms use the application's MUI theme.

## Quick start

Import modules from their individual subpaths. This example registers BigWig and creates one signal track:

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
      base: { id: "signal", title: "Signal" },
      config: { url: "YOUR_URL_HERE" },
    }),
  ],
});

export function BrowserPage() {
  return <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />;
}
```

Replace `YOUR_URL_HERE` with an hg38 BigWig URL containing data in the selected region. The file server must support byte-range requests and allow requests from your application through CORS. The browser measures its container automatically; give it a container with a positive width.

The store factories return Zustand hooks, so their names begin with `use`. These file-scoped stores retain state across renders and share it between every mounted `BrowserPage`. See [Use first-party tracks](docs/gettingStarted/useTracks.md) for the complete setup with a ruler and track configuration.

## Documentation

- [Documentation overview](docs/README.md): entry points for using tracks and reusing shared components.
- [Use first-party tracks](docs/gettingStarted/useTracks.md): choose a module, connect its source, and render a browser.
- [Choose a track module](docs/reference/trackModules/README.md): find a module for your file format or dataset.
- [API reference](docs/reference/README.md): module contracts, shared utilities, and the public export index.
- [Data source troubleshooting](docs/legacy/dataSources.md): diagnose failed file requests.
