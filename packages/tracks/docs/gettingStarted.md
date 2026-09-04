# Getting started

Install the track modules with the matching runtime prerelease and their React and MUI peer dependencies:

```sh
pnpm add @weng-lab/genomebrowser-tracks@beta @weng-lab/genomebrowser@beta react@^19.2 react-dom@^19.2 @emotion/react @emotion/styled @mui/material
```

The settings panels use your application's MUI theme. This package does not install a global theme or stylesheet.

## Create and register a track

Import runtime APIs from `@weng-lab/genomebrowser` and track modules from this package:

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

Replace `YOUR_URL_HERE` with an absolute public HTTP(S) BigWig URL that permits byte-range requests from the browser. See [Data source troubleshooting](dataSources.md) if the file does not load. Store factories return Zustand hooks, so keep their results stable and use a `use` prefix in their names.

Register every module that initial tracks, later track updates, or collection UIs may use. Register all eight with `firstPartyTrackModules`:

```ts
import { createTrackStore } from "@weng-lab/genomebrowser";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";

const useTrackStore = createTrackStore({ modules: firstPartyTrackModules });
```

## Validate data before creating a track

Each module has two Zod schemas:

```ts
const configResult = bigWigModule.configSchema.safeParse({
  url: "YOUR_URL_HERE",
});

const inputResult = bigWigModule.createInputSchema.safeParse({
  id: "signal",
  title: "Signal",
  config: { url: "YOUR_URL_HERE" },
});
```

Use `configSchema` to validate the module-specific `config` object. Use `createInputSchema` to validate the full create input: `id`, `title`, optional base fields, and config. `module.create(...)` parses that full input and throws if validation fails.

[Export contract](exports.md) describes the shared API. Each track page lists its source and configuration requirements.
