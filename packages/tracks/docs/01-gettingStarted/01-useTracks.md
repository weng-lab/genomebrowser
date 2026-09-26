# Use first-party tracks

Choose a module for your data, create a track, and register its module with core's track store. This example adds a coordinate ruler and a BigWig signal track to an existing React application.

Use React and React DOM 19.2 or later. For a new application, the [core documentation](https://github.com/weng-lab/genomebrowser/blob/main/packages/core/docs/README.md) covers the starter and browser integration.

## Install the packages

Core supplies the browser and its stores. Tracks supplies the modules and their settings forms, which use the application's MUI theme. Install the packages and their Emotion and MUI dependencies:

```sh
pnpm add @weng-lab/genomebrowser@2.0.0 @weng-lab/genomebrowser-tracks@2.0.0 @emotion/react@11 @emotion/styled@11 @mui/material@7
```

Render the browser on the client, where it can measure its container and request data. The tracks package does not install a global theme or stylesheet.

## Choose a module and source

[BigWig](../03-reference/01-trackModules/bigwig.md) displays signal from one BigWig file. For annotations, use [BigBed](../03-reference/01-trackModules/bigbed.md); for gene and transcript structures, use [Gene](../03-reference/01-trackModules/gene.md). For aligned sequencing reads, use [BAM](../03-reference/01-trackModules/bam.md) with matching BAM and BAI URLs. The [module index](../03-reference/01-trackModules/README.md) lists all supported formats and specialized tracks.

For this example, use an hg38 BigWig file containing signal on `chr1` between 1,000,000 and 1,100,000, or change the region to match your file. Replace `YOUR_URL_HERE` with the file URL. Its server must support HTTP byte-range requests and allow requests from your application's origin through CORS.

## Create the tracks

The following snippets form one `Browser.tsx` file. Collect the imports at the top and keep both stores outside the component. Their names begin with `use` because the factories return Zustand hooks. File-scoped stores retain state across renders and share it between every mounted copy of this component.

A module defines how to fetch and display a type of data. An instance configures one track. Register the required modules in `modules`, then put their instances in `tracks` in display order:

```tsx
import { createTrackStore } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";

const useTrackStore = createTrackStore({
  modules: [rulerModule, bigWigModule],
  tracks: [
    rulerModule.create({
      base: { id: "ruler", title: "Coordinates" },
      config: {},
    }),
    bigWigModule.create({
      base: { id: "signal", title: "Signal" },
      config: { url: "YOUR_URL_HERE" },
    }),
  ],
});
```

`base` contains the common track properties, including an ID unique within the store and a title. `config` contains module-specific options. BigWig requires a URL; the ruler needs no source for its coordinate axis. Each module applies its display, height, and color defaults when creating a track.

## Connect the browser

The browser store identifies the assembly and initial region. Coordinates are zero-based and half-open, so `start` is included and `end` is excluded:

```tsx
import { createBrowserStore, hg38 } from "@weng-lab/genomebrowser";

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr1", start: 1_000_000, end: 1_100_000 },
});
```

Pass both stores to `GenomeBrowser`. It measures its container and follows width changes. The wrapper's `minWidth: 0` lets it shrink inside a flex or grid layout:

```tsx
import { GenomeBrowser } from "@weng-lab/genomebrowser";

export function Browser() {
  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
    </div>
  );
}
```

Render `<Browser />` from the application to see the coordinate ruler above the signal track. Optional DNA bases require a separate [ruler sequence source](../03-reference/01-trackModules/ruler.md). For independent browser instances, create a separate stable pair of stores per instance as described in core's documentation.

## Configure a track

To show BigWig as a compact intensity band, replace its creation call with:

```ts
bigWigModule.create({
  base: {
    id: "signal",
    title: "Signal",
    display: "dense",
    height: 24,
    color: "#2266aa",
  },
  config: { url: "YOUR_URL_HERE" },
});
```

BigWig's default `full` display represents signal through height. `dense` represents it through color intensity. Each module's reference lists its displays and config options.

Open **Settings for Signal** in the track controls to edit the track. URL edits apply when **Set** is activated. For an application-controlled source, add `source: "host"` alongside `base` and `config`; BigWig's settings form then disables URL editing while leaving appearance controls available.

## If the signal does not appear

Check the assembly, chromosome name, and data coverage in the selected region. Creating a track validates its configuration but does not check whether the source loads. Follow [Data source troubleshooting](../04-troubleshooting.md) for request errors. If neither track appears, check that the containing layout has a positive width.

## Continue

- [Create and validate tracks](../03-reference/01-trackModules/trackCreation.md): check external input and understand module creation methods.
- [firstPartyTrackModules](../03-reference/02-collectionsAndSchemas/firstPartyTrackModules.md): register every built-in type when the application supports all of them.
- [Collection JSON schema](../03-reference/02-collectionsAndSchemas/trackCollectionSchema.md): validate collections containing first-party tracks in an editor.
- [Core documentation](https://github.com/weng-lab/genomebrowser/blob/main/packages/core/docs/README.md): update tracks through store actions, navigate, and use collections.

Return to [Tracks documentation](../README.md).
