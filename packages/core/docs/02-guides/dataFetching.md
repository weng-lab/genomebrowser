# Data fetching and rendering

A mounted browser turns the visible region and track configuration into requests, then supplies successful results to each track's renderer. A custom track's fetcher must return data for the requested region, and its renderer must draw that data using the supplied coordinates.

The application owns the viewport and track instances. Core coordinates requests and decides which results remain compatible with the current view. The module fetches and processes data, then draws it as SVG. [Create a custom track](customTracks.md) introduces those module pieces with local annotations; this guide explains request timing and how fetchers and renderers use the same coordinates.

## Fetch for the render demand

The visible viewport is the region requested by the application. The render region includes additional bases around that viewport so existing content can move immediately during panning. Core supplies that expanded region and its logical SVG width as `demand.region` and `demand.width`.

A fetcher should use those supplied values together. Reading the visible region from an application store would omit the extra data that the renderer expects and couple the module to one application. The fetch context also includes the requested assembly and a track snapshot containing its type, ID, display, and parsed config.

A fetcher returns the data needed to draw the requested region. This example uses a small local dataset to show how `demand.region` and track configuration determine that result. It returns records that overlap the region and meet the configured minimum score.

```ts
import { z } from "zod";
import { fetchOnChange, type TrackFetch } from "@weng-lab/genomebrowser";

const records = [
  { chromosome: "chr1", start: 100, end: 200, score: 5 },
  { chromosome: "chr1", start: 300, end: 400, score: 12 },
  { chromosome: "chr2", start: 100, end: 200, score: 8 },
];

export const configSchema = z.object({
  minimumScore: fetchOnChange(z.number().default(0)),
  opacity: z.number().min(0).max(1).default(1),
});

type Config = z.output<typeof configSchema>;
type Data = typeof records;

export const fetchScoredRegions: TrackFetch<Config, Data> = async ({ track, demand }) => {
  const { chromosome, start, end } = demand.region;
  return records.filter(
    (record) =>
      record.chromosome === chromosome &&
      record.start < end &&
      record.end > start &&
      record.score >= track.config.minimumScore,
  );
};
```

Assign `configSchema` and `fetchScoredRegions` to the module's `configSchema` and `fetch` options. Its renderer receives the returned records through `TrackRendererProps<Config, Data>`. For a demand covering `chr1:0–500` and a minimum score of `10`, only the record with score `12` reaches the renderer.

## Decide which settings affect requests

Core observes committed track state and compares the parsed values marked by `fetchOnChange`. In the example above, `minimumScore` determines which records reach the renderer. Changing it requires the fetcher to run again so the result reflects the new threshold.

The renderer can apply `opacity` to SVG output using the existing records. Leaving it unmarked allows those edits to redraw without a request. If score filtering moved into the renderer, `minimumScore` could likewise become a rendering-only setting. The marker follows where a value is used, rather than whether its name sounds visual or data-related.

Apply markers to fields inside the config schema, outside optional or default wrappers. A marker around an object or array includes the entire value. Changes to the region, display, assembly, or logical width also trigger requests, without config markers.

| Change                                                     | Request behavior                          |
| ---------------------------------------------------------- | ----------------------------------------- |
| Initial mount or an added track                            | Fetch the new track data.                 |
| Requested region or assembly                               | Fetch tracks for the new demand.          |
| Logical render width                                       | Fetch after resizing stops.               |
| Track type, display, or a marked config value              | Replace that track's incompatible result. |
| Title, color, height, callbacks, order, or unmarked config | Redraw without triggering a data request. |

An equivalent marked value does not force a request. Replacing an instance with the same ID and the same fetch inputs can therefore reuse its existing result. A state update reports whether configuration was accepted, not whether any resulting fetch has completed.

## Keep rendering coordinates aligned

The renderer receives `region` and `width` corresponding to its displayed data. During a same-scale pan, that can still be the previous render region while a new request is in flight. Core positions that content relative to the viewport, so the renderer must continue to map its records using the supplied pair.

Use `visibleRegion` for decisions that specifically depend on what is on screen, such as the value range or number of visible rows. Use `region` and `width` for horizontal placement. Mixing the visible region with the overscanned width stretches or shifts features during navigation.

For a region beginning at `start`, the horizontal position is:

```ts
const x = ((start - region.start) / (region.end - region.start)) * width;
```

Zooming changes the genomic scale, making old content incompatible with the new geometry. Core shows a loading indicator while it requests data for the new scale. Display, marked-config, and logical-width changes also invalidate results that may have been processed for the previous inputs.

## Reuse a reader across requests

Some fetchers create a reusable object, such as an indexed file reader that retains file metadata. `resources` provides storage for that object across requests within one track and one mounted browser. Core does not inspect the stored value, so the fetcher must decide whether it remains valid after a source change.

The following separate example uses the reader package to retrieve raw BigWig values. Install `@weng-lab/genomic-reader@2.0.0` as a direct dependency when importing it in a custom module. The cached entry includes its source URL, allowing a later URL edit to replace the reader before making the next request.

```ts
import type { TrackFetch } from "@weng-lab/genomebrowser";
import {
  createBigWigFile,
  type BigWigFile,
  type BigWigValueRecord,
} from "@weng-lab/genomic-reader";

type FileConfig = { url: string };
type CachedReader = { url: string; file: BigWigFile };

export const fetchValues: TrackFetch<FileConfig, BigWigValueRecord[]> = async ({
  track,
  demand,
  resources,
}) => {
  let cached = resources.get<CachedReader>("signal-reader");
  if (!cached || cached.url !== track.config.url) {
    cached = {
      url: track.config.url,
      file: createBigWigFile({ url: track.config.url }),
    };
    resources.set("signal-reader", cached);
  }
  return cached.file.read(demand.region);
};
```

The module using this fetcher must mark its URL field with `fetchOnChange`. This example reads raw values to illustrate resource lifetime. A module intended for wide genomic views can instead choose an appropriate summary level using the requested width, as the first-party BigWig module does.

`resources` can cache any reusable value, including fetched data for entire genomic regions. Large data caches can consume substantial memory, so limit their size and remove entries that are no longer needed.

Resource values survive demand and config changes, but removing the track or unmounting its browser releases core's references. There is no disposal callback or automatic eviction policy. Store values that can be rebuilt when needed. Two browsers sharing a track store still have separate resource storage.

## Request timing and failures

When only the width changes, core waits until resizing has stopped for 200 ms before requesting data. If another fetch input changes during that wait, core starts the request immediately using the latest width.

Core starts the tracks' fetchers together and displays their results once every request in the batch has finished. A failed track shows an error while successful tracks show their data, but a slow request delays the whole batch. Core blocks pointer interactions while fetching or while data is drawn at an outdated position.

When newer requests supersede a batch, core ignores the old results. The underlying work is not cancelled, and the fetch contract has no abort signal. Fetchers should return their result rather than directly mutating application state.

Resource writes must account for requests that can overlap. Store the reader in `resources` before awaiting its result, as above. Each request then keeps its own reader reference even if another request replaces the cached entry.

## Further reading

- [Fetching data reference](../03-reference/03-trackDefinition/fetchingData.md): exact context fields, resources, and request lifetime.
- [fetchOnChange](../03-reference/03-trackDefinition/fetchOnChange.md): schema traversal and marker placement.
- [Track renderers](../03-reference/04-rendererIntegration/trackRenderer.md): rendering props and visible-region calculations.
