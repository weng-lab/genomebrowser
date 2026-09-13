# useGenomeBrowser

Resolve the hosting browser's stores from a track renderer, settings component, or tooltip. Use the returned hooks to subscribe to state, or their imperative methods in event handlers.

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

The returned hooks retain the identities and APIs of the stores supplied to `GenomeBrowser`, including `getState()`, `subscribe()`, and `setState()`. Use validated actions when changing state. The wrapper object is newly returned on each call; its identity is not a stability guarantee.

Resolving context does not subscribe to store state. Calling a returned hook with a selector subscribes to that selection. Ordinary parent renders can still render the consumer. The contextual track store uses the general `TrackStoreInstance` type; module-specific registry inference is retained on the application's factory result.

## Context and lifetime

The hook throws `useGenomeBrowser must be used within a GenomeBrowser` outside a hosted component. Fetchers and module-definition code cannot call React hooks.

Independent browsers resolve their own supplied stores; supplying the same stores shares state. Replacing a supplied store changes the store resolved by consumers. Unmounting the browser removes its context but does not discard application-owned stores. Clean up any imperative subscriptions when their consumer is disposed.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
