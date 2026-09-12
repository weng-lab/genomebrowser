# Getting Started

Install the runtime, the first-party tracks used in this example, and their React and MUI dependencies:

```sh
pnpm add @weng-lab/genomebrowser@beta @weng-lab/genomebrowser-tracks@beta react@^19.2 react-dom@^19.2 @emotion/react @emotion/styled @mui/material
```

The browser needs one stable browser store, one stable track store, and at least one registered module. The browser follows its container automatically.

The browser store's `marginWidth` option is optional and defaults to 50 pixels.

## Minimal responsive browser

This example registers the first-party BigWig module from `@weng-lab/genomebrowser-tracks`, creates one track, and keeps the SVG track area matched to its container. Replace `YOUR_URL_HERE` with a BigWig URL accessible from the browser.

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
      id: "signal",
      title: "Signal",
      config: { url: "YOUR_URL_HERE" },
    }),
  ],
});

export function BrowserPage() {
  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
    </div>
  );
}
```

Store factory results are Zustand hooks, so local names should begin with `use`. Define them outside the component as above, or create them once in another stable initialization boundary. Recreating either store during render resets browser state and request coordination.

For fixed dimensions or whole-browser magnification, see [GenomeBrowser](GenomeBrowser.md). You do not need a container ref, a resize observer, or calls to `setTrackWidth` for responsive sizing.

## Updating the browser

Store actions are available through `getState()` outside React. Runtime region, zoom, viewport-size, and track mutations return discriminated results so expected user-input errors can be displayed.

```ts
const regionResult = useBrowserStore.getState().setRegion({
  chromosome: "chr1",
  start: 1_200_000,
  end: 1_250_000,
});

if (!regionResult.ok) {
  console.error(regionResult.error);
}

const result = useTrackStore.getState().updateTrack("signal", {
  config: { url: "YOUR_URL_HERE" },
});

if (!result.ok) {
  console.error(result.error);
}
```

Changing the region requests all tracks for the new render region. BigWig marks its URL as data-dependent, so changing that URL requests the track again. Invalid runtime updates leave existing state unchanged. Browser-store construction instead throws when its required assembly, initial region, or dimensions are invalid.

Next, read [Core concepts](concepts.md) for lifecycle and request semantics, then use [Recipes](recipes.md) for common mutations and navigation.

The browser has no implicit ruler header. Register and add `rulerModule` from `@weng-lab/genomebrowser-tracks/ruler` when you want coordinates or reference sequence. Region selection works independently; see [Region selection](concepts.md#region-selection-and-ruler-tracks).
