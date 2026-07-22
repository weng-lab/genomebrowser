# @weng-lab/genomebrowser-ui-v2

Ready-made React controls for applications built with `@weng-lab/genomebrowser-v2`.

UI v2 provides higher-level interfaces such as catalog-backed track selection and interactive cytoband navigation. Its controls share v2 stores with `GenomeBrowser`, keeping application UI and rendered tracks synchronized.

> This package is under active development and its public API may change.

## Install

Install UI v2, the browser runtime, and the required peer dependencies:

```sh
pnpm add @weng-lab/genomebrowser-ui-v2 @weng-lab/genomebrowser-v2 react@^19.2 react-dom@^19.2 @emotion/react @emotion/styled @mui/material @mui/icons-material @mui/x-data-grid-premium @mui/x-license @mui/x-tree-view
```

The supported peer versions are React 19.2+, Emotion 11, MUI 7, and MUI X 8. UI v2 participates in your application's normal MUI theme and does not require a package-specific stylesheet or provider.

## MUI X license

UI v2 uses MUI X Premium components. Your application must have an MUI X Premium license and configure it before rendering UI v2:

```ts
import { LicenseInfo } from "@mui/x-license";

LicenseInfo.setLicenseKey(import.meta.env.VITE_MUI_X_LICENSE_KEY);
```

Keep this setup in your application entry point or another module imported before UI v2. The environment variable name is application-defined; UI v2 does not read it or distribute a license key.

## Quick start

Create the v2 stores and track catalogs outside component rendering. Pass the same track store to `GenomeBrowser` and `TrackSelect`.

```tsx
import { useState } from "react";
import { TrackSelect } from "@weng-lab/genomebrowser-ui-v2";
import {
  GenomeBrowser,
  bigWigModule,
  createBrowserStore,
  createTrackStore,
} from "@weng-lab/genomebrowser-v2";

const useBrowserStore = createBrowserStore({
  region: "chr1:1000000-1100000",
  trackWidth: 900,
});

const useTrackStore = createTrackStore({
  modules: [bigWigModule],
});

const trackCatalogs = [
  {
    id: "signals",
    label: "Signal tracks",
    views: [
      {
        id: "by-assay",
        label: "By assay",
        columns: [{ field: "assay", label: "Assay" }],
        grouping: ["assay"],
        leaf: "title",
      },
    ],
    tracks: [
      {
        type: "bigwig",
        id: "example-signal",
        title: "Example signal",
        config: { url: "YOUR_URL_HERE" },
        metadata: { assay: "ATAC-seq" },
      },
    ],
  },
];

export function BrowserWithTrackSelect() {
  const [trackSelectOpen, setTrackSelectOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setTrackSelectOpen(true)}>
        Choose tracks
      </button>

      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />

      <TrackSelect
        open={trackSelectOpen}
        onClose={() => setTrackSelectOpen(false)}
        trackCatalogs={trackCatalogs}
        useTrackStore={useTrackStore}
        defaultTrackIds={["signals::example-signal"]}
      />
    </>
  );
}
```

Replace `YOUR_URL_HERE` with a BigWig URL accessible from the browser. Catalog selections remain a draft until the user submits them; canceling or closing the dialog leaves the track store unchanged.

## When to use UI v2

Use `@weng-lab/genomebrowser-v2` by itself when you only need to render and control a genome browser. Add UI v2 when you need its ready-made application controls and can provide the required MUI dependencies and licensing.

## Documentation

- [Getting started](docs/gettingStarted.md) - connect `TrackSelect` to a browser
- [TrackSelect](docs/trackSelect.md) - catalogs, selection behavior, customization, and schema tooling
- [Cytobands](docs/cytobands.md) - chromosome ideograms, region brackets, and interactive loci
- [Track interactions](docs/recipes/trackInteractions.md) - connect catalog tracks to host callbacks
