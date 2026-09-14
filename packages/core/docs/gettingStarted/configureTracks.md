# Add and configure tracks

To add a track to the browser, register its module in the track store and create an instance with the desired data source and settings. Multiple tracks can use the same module with different configurations. Once added, their settings and order can be changed through the track store.

This chapter builds on [Create a genome browser](firstBrowser.md) by adding another BigWig track, changing track settings and order, and adding a BigBed track with a feature-click callback. The examples use the existing hg38 browser store and require browser-accessible hg38 BigWig and BigBed files.

## Add another signal track

The second signal track uses the same BigWig module as the first, with its own ID, title, color, and data URL. To keep track configuration available to the browser and the examples that follow, move the two store declarations and their imports from `Browser.tsx` into `browserState.ts` and export them.

In `browserState.ts`, retain the browser store from the first chapter and replace the track store with the definition below. The module array is exported separately so later collection examples can use the same registry. Replace each URL placeholder with the appropriate file URL.

```ts
import { createBrowserStore, createTrackStore, hg38 } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";

export const trackModules = [rulerModule, bigWigModule] as const;

export const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr1", start: 1_000_000, end: 1_100_000 },
});

export const useTrackStore = createTrackStore({
  modules: trackModules,
  pinnedTrackIds: ["ruler"],
  tracks: [
    rulerModule.create({
      base: { id: "ruler", title: "Coordinates" },
      config: {},
    }),
    bigWigModule.create({
      base: { id: "signal", title: "Signal", color: "#2266aa" },
      config: { url: "YOUR_URL_HERE" },
    }),
    bigWigModule.create({
      base: { id: "comparison", title: "Comparison", color: "#a34b80" },
      config: { url: "YOUR_URL_HERE" },
    }),
  ],
});
```

Pinning the ruler keeps it above the data tracks when their order changes. Pinning controls position; the ruler can still be removed. The remaining rows begin in their `tracks` array order.

With the stores moved, `Browser.tsx` becomes the component that places the visualization in the layout:

```tsx
import { GenomeBrowser } from "@weng-lab/genomebrowser";
import { useBrowserStore, useTrackStore } from "./browserState";

export function Browser() {
  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
    </div>
  );
}
```

## Change a track after creation

The creation input establishes a track's initial settings. Subsequent changes go through the track store's actions, which validate the resulting instance before committing it. An `updateTrack` patch can change common properties under `base` and module options under `config`. Omitted top-level fields retain their current values, so changing a color does not require resupplying the title or data URL.

The following control switches the signal track to its dense display and gives both signal tracks the same vertical range. A shared range makes the two plots use the same numeric scale. The nested `yRange` value is supplied in full because patches are shallow: replacing it does not merge its previous `min` and `max` fields.

Add this component in `SignalControls.tsx` and render `<SignalControls />` alongside `<Browser />` in `App.tsx`. The error belongs to the control that performs the update, while the accepted track settings remain in the shared store.

```tsx
import { useState } from "react";
import { useTrackStore } from "./browserState";

export function SignalControls() {
  const updateTrack = useTrackStore((state) => state.updateTrack);
  const [error, setError] = useState<string | null>(null);

  function applyComparisonDisplay() {
    for (const id of ["signal", "comparison"]) {
      const result = updateTrack(id, {
        base: { display: "dense" },
        config: { yRange: { min: 0, max: 100 } },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
    }
    setError(null);
  }

  return (
    <div>
      <button type="button" onClick={applyComparisonDisplay}>
        Compare signals on a 0–100 scale
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
```

These are two separate validated updates. If the second fails, the first remains committed. Applications that need an all-or-nothing replacement can construct the complete next list and pass it to `setTracks` instead.

A display change requests replacement data. BigWig color and vertical-range changes affect rendering, while a URL change requests data from the new source. The distinction is defined by each module and is explained in [Data fetching and rendering](../guides/dataFetching.md).

## Arrange the rows

The store exposes the current display order as track IDs. To move the comparison above the signal, select the `reorderTracks` action in a control and pass it the desired order when the button is pressed. Include every current track exactly once; a missing or duplicate ID causes a rejected result and leaves the order unchanged. Add this component to `TrackOrderControls.tsx` and render it alongside the other controls:

```tsx
import { useState } from "react";
import { useTrackStore } from "./browserState";

export function TrackOrderControls() {
  const reorderTracks = useTrackStore((state) => state.reorderTracks);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          const result = reorderTracks(["ruler", "comparison", "signal"]);
          setError(result.ok ? null : result.error);
        }}
      >
        Move comparison above signal
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
```

The store applies its pinned order before the unpinned rows, so the ruler retains its top position. Reordering changes the arrangement without changing the data sources or requesting new data.

## Connect a feature to application behavior

Each module determines the data passed to interaction callbacks. BigBed passes the clicked feature, including its chromosome and region, so the callback can navigate to it. BigWig provides hover data for signal values but does not emit feature-click events.

To add a clickable annotation row, import `bigBedModule` into `browserState.ts`, include it in `trackModules`, and append the following instance to the initial `tracks` array. The callback is the second argument to `create`. Because it is defined outside React with the instance, it uses `getState()` to access the shared browser store's navigation action.

```ts
import { bigBedModule } from "@weng-lab/genomebrowser-tracks/bigbed";

const annotationTrack = bigBedModule.create(
  {
    base: { id: "annotations", title: "Annotations", display: "squish" },
    config: { url: "YOUR_URL_HERE" },
  },
  {
    onClick: (item) => {
      const result = useBrowserStore.getState().setRegion({
        chromosome: item.chromosome,
        start: item.start,
        end: item.end,
      });
      if (!result.ok) console.error(result.error);
    },
  },
);
```

Declare `annotationTrack` after the browser store and before the track store, then add it to `tracks`. If using the reorder example above, include `"annotations"` in that order as well.

The callback can also receive a second argument containing the track's current `base` and `config`. This keeps application actions tied to the latest validated settings rather than values captured when the track was created. Custom modules define their own items and event handlers, as shown in [Create a custom track](../guides/customTracks.md).

## Continue

[Navigate and select regions](navigationAndSelection.md) covers panning, zooming, and highlighting regions across the track display.
