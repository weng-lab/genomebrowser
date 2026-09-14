# useGenomeBrowser

Resolve the hosting browser's stores from a track renderer, settings component, or tooltip. Use the returned hooks to select displayed state and actions, then invoke selected actions from event handlers.

## Usage

This SVG annotation can be rendered inside a module's track renderer:

```tsx
import { TrackOverlay, useGenomeBrowser } from "@weng-lab/genomebrowser";

export function VisibleChromosome() {
  const { useBrowserStore } = useGenomeBrowser();
  const chromosome = useBrowserStore((state) => state.region.chromosome);
  return (
    <TrackOverlay>
      <text x={8} y={16}>
        {chromosome}
      </text>
    </TrackOverlay>
  );
}
```

Application controls outside `GenomeBrowser` use their application-owned [browser store](browserStore.md) and [track store](trackStore.md) directly. `GenomeBrowser` does not accept arbitrary children.

## API

`useGenomeBrowser(): GenomeBrowserStores` returns the nearest hosting browser's two bound Zustand hooks.

### GenomeBrowserStores

| Field             | Type                   | Description                                                   |
| ----------------- | ---------------------- | ------------------------------------------------------------- |
| `useBrowserStore` | `BrowserStoreInstance` | Assembly, viewport, selection, and highlights.                |
| `useTrackStore`   | `TrackStoreInstance`   | Registered modules, track instances, ordering, and mutations. |

The returned hooks retain the identities and APIs of the stores supplied to `GenomeBrowser`, including `getState()`, `subscribe()`, and `setState()`. Use validated actions when changing state. Each call returns a new wrapper object, so do not rely on that object keeping the same identity.

Calling `useGenomeBrowser()` does not subscribe to state. Call a returned store hook with a selector to subscribe to the value the component displays. Selecting `state.updateTrack` subscribes to the action function, which stays the same when tracks change. Parent renders can still render the component.

`getState()` reads a snapshot without subscribing. Use it when an event needs a current value that does not drive rendering. See [state and action access](../../gettingStarted/firstBrowser.md#access-browser-state-and-actions) for examples.

The returned track store uses the general `TrackStoreInstance` type. The application's factory result retains more specific registry types inferred from its module list.

## Context and lifetime

The hook throws `useGenomeBrowser must be used within a GenomeBrowser` outside a hosted component. Fetchers and module-definition code cannot call React hooks.

Independent browsers resolve their own supplied stores; supplying the same stores shares state. Replacing a supplied store changes the store resolved by consumers. Unmounting the browser removes its context but does not discard application-owned stores. Clean up any imperative subscriptions when their consumer is disposed.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
