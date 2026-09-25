# Fetching track data

Implement a module's `fetch` function to load and prepare data for its renderers. Core supplies the requested region, width, storage scoped to this track, and an abort signal.

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

`TrackFetch<Config, Data>` is `(context: TrackFetchContext<Config>) => Promise<Data>`. Each request receives a track snapshot, the render demand, track-local resources, and an abort signal.

| Context field | Type                      | Contents                                                                          |
| ------------- | ------------------------- | --------------------------------------------------------------------------------- |
| `track`       | `TrackFetchTrack<Config>` | Readonly `type`, `base: { id, display }`, and complete parsed config.             |
| `demand`      | `TrackFetchDemand`        | Readonly `assembly`, expanded `region`, `visibleRegion`, and logical SVG `width`. |
| `resources`   | `TrackResources`          | Storage retained between requests for this track in this mounted browser.         |
| `signal`      | `AbortSignal` (optional)  | Aborts when core no longer needs this request.                                    |

Use `demand.visibleRegion` for viewport-dependent decisions such as a zoom limit. Read data for `demand.region`, which includes overscan. The visible region is a snapshot at request time. Core may reuse fetched data during same-scale pans; zooming triggers a new request even when chromosome clipping leaves the expanded region unchanged.

The snapshots are shallow readonly views. Fetchers may return raw records or process them for the supplied display and width. The requested region includes extra bases outside the visible viewport to support panning. Mark config fields used for requests or fetch-time processing with [fetchOnChange](fetchOnChange.md#fetchonchange).

A rejected fetch puts that track into an error state. The error message appears as text in its lane, prefixed with the title; long messages wrap and can be scrolled. Other tracks can succeed even when this fetch rejects.

`signal` is optional in the type so code can call a fetcher directly, but a mounted browser always supplies it. Pass it to network or reader calls, such as `file.read(region, { signal })`, so a superseded download stops. A fetcher that catches errors to return partial data should rethrow when `signal.aborted` is true. Core ignores the result of an aborted request either way.

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

Each track requests its data separately and shows its result as soon as it arrives. A rejected fetch becomes that track's error result and does not affect other tracks. An error result is retried on the next region, assembly, width, or fetch-input change, never on a timer.

When a newer request replaces one, or its track is removed, core aborts that request's `signal` and ignores its result.

A pan that still leaves at least half a visible span of loaded data beyond each edge of the view does not request data. Otherwise the track requests the window around the new view and keeps displaying its existing data at the correct position until the result arrives. Each track can therefore show data for a different region. Renderers must use their supplied [render region and width](../04-rendererIntegration/trackRenderer.md), which can differ from the visible viewport and from other tracks.

A zoom, or a changed display or marked config value, hides the existing result and shows a loading state until new data arrives. Pointer interactions stay blocked until every track has a result for the current request.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
