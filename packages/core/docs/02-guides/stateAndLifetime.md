# State and browser lifetime

The application stores the assembly, region, tracks, and highlights. Each mounted `GenomeBrowser` separately keeps its container measurements, fetched results, track resources, and open settings or tooltip state.

Removing `GenomeBrowser` discards its local state. The application's stores can remain available for another browser to use. The examples assume the packages installed in [Create a genome browser](../01-gettingStarted/01-firstBrowser.md).

## Choose the store lifetime

A store declared at file scope is shared by every component that imports it. This is useful when a page has one browser session and several controls that should operate on it. Navigating away from the visualization does not reset those stores as long as the application retains them. A page reload still creates fresh JavaScript state unless the application explicitly saves and restores it.

For independent browsers, create the stores once inside each `BrowserSession` component. The lazy `useState` initializer below runs when the component mounts. Renders reuse those stores, and each mounted `BrowserSession` has its own pair. `initialRegion` sets the starting region; later changes to that prop do not navigate the browser.

```tsx
import { useState } from "react";
import {
  GenomeBrowser,
  createBrowserStore,
  createTrackStore,
  hg38,
  type GenomicRegion,
} from "@weng-lab/genomebrowser";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";

function createStores(initialRegion: GenomicRegion) {
  return {
    useBrowserStore: createBrowserStore({ assembly: hg38, region: initialRegion }),
    useTrackStore: createTrackStore({
      modules: [rulerModule],
      tracks: [
        rulerModule.create({
          base: { id: "ruler", title: "Coordinates" },
          config: {},
        }),
      ],
    }),
  };
}

export function BrowserSession({ initialRegion }: { initialRegion: GenomicRegion }) {
  const [{ useBrowserStore, useTrackStore }] = useState(() => createStores(initialRegion));

  return <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />;
}
```

To navigate an existing session, call its browser store's `setRegion` action. To start an entirely new session, remount `BrowserSession` with a different React key. That recreates both stores and the mounted browser together. Assembly definitions are fixed for a browser store's lifetime, so changing genomes also requires a new browser store and tracks appropriate to that genome.

## Share state between views

Passing the same store pair to two browsers links their region, highlights, track settings, and order. Each view still measures its own container and owns its own fetched data and resources. The two views can therefore have different drawing widths and make separate requests, even when they display the same region.

Using the stores from `browserState.ts` in the getting-started chapters, the following component shows a wide view and a narrow view of one session:

```tsx
import { GenomeBrowser } from "@weng-lab/genomebrowser";
import { useBrowserStore, useTrackStore } from "./browserState";

export function LinkedViews() {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ width: "100%", minWidth: 0 }}>
        <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
      </div>
      <div style={{ width: 400, maxWidth: "100%", minWidth: 0 }}>
        <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
      </div>
    </div>
  );
}
```

Sharing only the browser store links navigation and highlights while allowing each view to show a different track list. Sharing only the track store links track configuration while allowing independent regions. A shared track store also shares height changes, including changes made by a renderer that adjusts its own row height.

## Read state where it is used

Application components import or receive their application's store and select the values they display. A region label should select `state.region`, so highlight or selection-mode changes do not trigger a store subscription update.

Select actions at the top level of the component too, then call them from event handlers. Core's action functions stay the same when state changes, so selecting `state.setRegion` does not subscribe to region changes. [Access browser state and actions](../01-gettingStarted/01-firstBrowser.md#access-browser-state-and-actions) shows a component using both kinds of selector.

A readout that only displays coordinates needs just the region subscription:

```tsx
import { useBrowserStore } from "./browserState";

export function RegionReadout() {
  const region = useBrowserStore((state) => state.region);

  return (
    <p>
      {region.chromosome}:{region.start}–{region.end}
    </p>
  );
}
```

`getState()` provides a current snapshot without subscribing. Use it in code outside React, such as a module callback declared at file scope, or when an event needs to inspect a current value that does not belong in the component's rendered state. Reading through it during rendering cannot keep a display synchronized. Do not call a store hook inside an event handler.

Reusable renderers, settings forms, and tooltips obtain their stores through `useGenomeBrowser()`. Importing a particular application's store into a reusable module would bind every instance of that module to that application, even when rendered by another browser.

This label can be included in a module renderer. It resolves the hosting store, subscribes to the region, and uses `TrackLabel` to anchor its text within the visible plot:

```tsx
import { TrackLabel, useGenomeBrowser } from "@weng-lab/genomebrowser";

export function VisibleRegionLabel() {
  const { useBrowserStore } = useGenomeBrowser();
  const region = useBrowserStore((state) => state.region);

  return (
    <TrackLabel anchor="top-left">
      {`${region.chromosome}:${region.start}–${region.end}`}
    </TrackLabel>
  );
}
```

Resolving `useGenomeBrowser()` does not itself subscribe to state; calling one of its returned hooks does. The context is available to components hosted inside the browser. A sibling toolbar uses the application-owned store directly. Application children passed to `GenomeBrowser` render outside the SVG and share its context. Fetch functions also receive their own explicit inputs and cannot call React hooks.

## Preserve configuration across rendering changes

Track renderers can unmount when their data or display becomes incompatible with the next request. Local renderer state is therefore suitable for temporary hover feedback, but persistent display settings belong in the track store. Updating the instance through `updateTrack` makes those settings available to the next renderer and to application controls.

Unmounting `GenomeBrowser` discards its container measurement, displayed data, and track resources. Remounting it with the same application-owned stores retains the region and track configuration but fetches data again. A fetch already in flight can continue after unmounting; core ignores obsolete results rather than cancelling the underlying work.

To save a session, store the values needed to recreate its browser and tracks, then validate them when loading. Do not serialize store hooks, callbacks, or reader objects. Cached fetch results are separate from session configuration.

Collection selection IDs save only catalog choices. Custom schemas that transform config input may need an explicit conversion from runtime values back to authored input.

## Further reading

- [useGenomeBrowser](../03-reference/01-browserSetup/useGenomeBrowser.md): hosted context and bound store APIs.
- [Data fetching and rendering](dataFetching.md): request inputs, resources, and result lifetime.
- [Use track collections](../01-gettingStarted/04-trackCollections.md#restore-and-save-selections): saving a submitted catalog selection.
