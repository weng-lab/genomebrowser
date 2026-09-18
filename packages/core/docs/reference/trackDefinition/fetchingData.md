# Fetching track data

Implement a module's `fetch` function to load and prepare data for its renderers. Core supplies the requested region, width, and storage scoped to this track.

## Usage

This fetcher returns regions stored in the module's config; it needs no network service:

```ts
import type { TrackFetch } from "@weng-lab/genomebrowser";

type Interval = { start: number; end: number };
type Config = { intervals: Interval[] };

export const fetchIntervals: TrackFetch<Config, Interval[]> = async ({ track }) => {
  return track.config.intervals;
};
```

Pass `fetchIntervals` as a module's `fetch` option and mark its `intervals` schema with [fetchOnChange](fetchOnChange.md). The [module definition example](defineTrackModule.md) shows how to connect the fetcher to a module.

## Fetching data

`TrackFetch<Config, Data>` is `(context: TrackFetchContext<Config>) => Promise<Data>`. Each request receives a track snapshot, the render demand, and track-local resources.

| Context field | Type                      | Contents                                                                  |
| ------------- | ------------------------- | ------------------------------------------------------------------------- |
| `track`       | `TrackFetchTrack<Config>` | Readonly `type`, `base: { id, display }`, and complete parsed config.     |
| `demand`      | `TrackFetchDemand`        | Readonly `assembly`, genomic `region`, and logical SVG `width`.           |
| `resources`   | `TrackResources`          | Storage retained between requests for this track in this mounted browser. |

The snapshots are shallow readonly views. Fetchers may return raw records or process them for the supplied display and width. The requested region includes extra bases outside the visible viewport to support panning. Mark config fields used for requests or fetch-time processing with [fetchOnChange](fetchOnChange.md#fetchonchange).

A rejected fetch puts that track into an error state. The error message appears as text in its lane, prefixed with the title; long messages wrap and can be scrolled. Other tracks can succeed even when this fetch rejects. The fetch contract does not include an abort signal.

### TrackResources

Use resources for rebuildable values such as a file reader or a cache. Keys are local to one track type and ID in one mounted browser; stores are not shared across tracks or browser instances.

| Method                             | Result             | Behavior                                                                           |
| ---------------------------------- | ------------------ | ---------------------------------------------------------------------------------- |
| `get<T>(key: string)`              | `T` or `undefined` | Reads a value. The generic type is the caller's assertion, not runtime validation. |
| `set(key: string, value: unknown)` | `void`             | Stores or replaces any value.                                                      |
| `delete(key: string)`              | `void`             | Removes one key.                                                                   |
| `clear()`                          | `void`             | Removes all values for this track.                                                 |

Values persist across requests and demand/config changes. The fetcher decides when a source change requires replacing cached values. Core releases references when a track is removed or the browser unmounts; it provides no disposal callback or eviction policy. Store only values you can rebuild.

## Requests and result lifetime

A mounted browser requests data for initial tracks and added tracks. Changes to the requested assembly, region, or logical width request data again. A changed track type, display, or marked config value invalidates that track's result. Title, color, height, callback, ordering, and unmarked config changes do not themselves request data. Replacing a track with the same ID and the same fetch inputs can reuse its result.

Core waits until width-only changes stop for 200 ms before requesting data. If another fetch input changes during that delay, core starts the request immediately using the latest width. Request regions can include overscan beyond the visible region; use the supplied demand rather than reading a browser store inside the fetcher.

Core ignores results from superseded request batches. It does not cancel the underlying work, so a fetch may continue after a new request starts or a track is removed.

Core runs the fetchers in a batch concurrently and commits their results after every fetch has finished or failed. A rejected fetch becomes a track-local error result and does not reject other tracks' fetches.

Core can keep displaying existing data during a same-scale pan while the next request is in progress. Renderers must use their supplied [render region and width](../rendererIntegration/trackRenderer.md), which can differ from the visible viewport.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
