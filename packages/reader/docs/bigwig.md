# Read BigWig files

Use `createBigWigFile` to read source signal values or stored zoom summaries from a public HTTP(S)
BigWig file. The reader fetches only the byte ranges needed for each genomic region.

## Install

Install the package and its Zod 4 peer dependency:

```sh
npm install @weng-lab/genomic-reader@alpha zod
```

## Read source values

Create a reusable file object, then read a zero-based, half-open region:

```ts
import { createBigWigFile } from "@weng-lab/genomic-reader";

const file = createBigWigFile({ url: "YOUR_URL_HERE" });
const region = { chromosome: "chr1", start: 100_000, end: 101_000 };

const records = await file.read(region);
```

Omitting `resolution` is equivalent to `{ resolution: { mode: "unzoomed" } }`. The returned
`BigWigValueRecord` objects contain the source signal values stored by the file:

```ts
type BigWigValueRecord = {
  kind: "value";
  chromosome: string;
  start: number;
  end: number;
  value: number;
};
```

Unzoomed reads do not invent summary statistics. They can return large arrays for wide regions, so
choose a zoom resolution explicitly when displaying a wide view.

## Select a resolution automatically

A reduction level is a file-declared genomic summary scale measured in bases. Larger levels are
coarser. Sparse data and summary boundaries mean returned records need not each span exactly the
level's number of bases or align one-for-one with that width.

For a visual client, calculate bases per pixel from the queried span and viewport width:

```ts
import { createBigWigFile } from "@weng-lab/genomic-reader";

const file = createBigWigFile({ url: "YOUR_URL_HERE" });
const region = { chromosome: "chr1", start: 0, end: 1_000_000 };
const viewportWidth = 1_000;

const records = await file.read(region, {
  resolution: {
    mode: "auto",
    basesPerPixel: (region.end - region.start) / viewportWidth,
  },
});
```

`basesPerPixel` must be a finite number greater than zero. Auto mode chooses the available reduction
level with the largest value less than or equal to `basesPerPixel`. It reads unzoomed values when no
level satisfies that rule, and naturally chooses the coarsest available level when the target is
coarser than every level in the file.

This selection targets a useful source resolution. It is not a hard result-count cap: the reader
does not aggregate again, force one record per pixel, or promise that the number of records equals
the viewport width. File-defined summaries may be sparse and need not align with display pixels.

## Discover and select an exact level

`getZoomLevels()` returns every reduction level declared by the file as an ascending readonly array.
The array is empty when the file has no zoom levels.

Use one of those values when you need a reproducible exact selection:

```ts
import { createBigWigFile } from "@weng-lab/genomic-reader";

const file = createBigWigFile({ url: "YOUR_URL_HERE" });
const region = { chromosome: "chr1", start: 0, end: 1_000_000 };
const zoomLevels = await file.getZoomLevels();
const reductionLevel = zoomLevels.at(-1);

if (reductionLevel !== undefined) {
  const records = await file.read(region, {
    resolution: { mode: "level", reductionLevel },
  });
}
```

A `reductionLevel` must be a positive integer and must exactly match an available level. An
unavailable exact level rejects; the reader does not substitute a nearby level or silently use
unzoomed data. Only auto mode may choose among levels.

## Understand zoom summaries

Zoom levels contain lossy, file-generated summaries of source values. A zoom read returns
`BigWigSummaryRecord` objects instead of pretending that an aggregate is a source value:

```ts
type BigWigSummaryRecord = {
  kind: "summary";
  chromosome: string;
  start: number;
  end: number;
  validCount: number;
  min: number;
  max: number;
  sum: number;
  sumSquares: number;
  mean: number;
};
```

The summary fields have these meanings:

| Field        | Source  | Meaning                                                                     |
| ------------ | ------- | --------------------------------------------------------------------------- |
| `validCount` | Stored  | Count of valid source positions contributing to the summary.                |
| `min`        | Stored  | Minimum contributing source value.                                          |
| `max`        | Stored  | Maximum contributing source value.                                          |
| `sum`        | Stored  | Sum of the contributing source values.                                      |
| `sumSquares` | Stored  | Sum of the squares of the contributing source values.                       |
| `mean`       | Derived | Convenience value computed as `sum / validCount`; it is not stored in file. |

The reader exposes all five stored statistics as JavaScript numbers without replacing them with a
single value. `mean` uses ordinary JavaScript division. Use unzoomed mode for work that requires
source measurements; zoom summaries cannot reconstruct those measurements.

`BigWigRecord` is the union `BigWigValueRecord | BigWigSummaryRecord`. Narrow it with `kind` before
using format-specific fields:

```ts
for (const record of records) {
  if (record.kind === "value") {
    console.log(record.value);
  } else {
    console.log(record.min, record.max, record.mean);
  }
}
```

## Regions and sparse results

Coordinates are zero-based and half-open. A source record overlaps a query when
`record.start < region.end && record.end > region.start`. Returned records keep their decoded source
coordinates; boundary-crossing records are not clipped to the query. The reader does not fill gaps
with zeroes, normalize chromosome names, synthesize intervals, or deduplicate source records.

The `chromosome` field preserves the exact queried name after that name resolves in the file. Results
are stably sorted by chromosome, start, and end, and equal-coordinate records retain source decode
order. An unknown chromosome or a valid region with no overlapping data resolves to `[]` in every
resolution mode.

Coordinates must be finite nonnegative integers, and `start` must be less than `end`. Invalid
coordinates reject instead of returning an empty result.

## Cancel an operation

Pass a native `AbortSignal` to either `read()` or `getZoomLevels()`:

```ts
import { createBigWigFile } from "@weng-lab/genomic-reader";

const file = createBigWigFile({ url: "YOUR_URL_HERE" });
const controller = new AbortController();
const pendingRecords = file.read(
  { chromosome: "chr1", start: 0, end: 1_000_000 },
  { signal: controller.signal },
);

controller.abort();
await pendingRecords;
```

Cancellation covers fetching and processing owned by that operation and preserves the native abort
failure. Each call keeps its own signal, so aborting one operation does not cancel a concurrent read
or zoom-level discovery on the same file object.

## HTTP server requirements

The URL must be an absolute public `http:` or `https:` URL. Local files, authenticated requests,
custom request headers, and custom `fetch` implementations are not supported.

The host must support exact byte-range requests and return `206 Partial Content`. For browser use,
its CORS policy must allow your application to fetch the file. Exposing `Content-Range` with a
numeric complete file size lets the reader verify returned offsets and traverse the file's index
with fewer requests, so it is recommended:

```http
Access-Control-Allow-Origin: https://your-application.example
Access-Control-Expose-Headers: Content-Range
```

The reader rejects servers or intermediaries that return `200 OK`, return a different accessible
`Content-Range`, return an incorrectly sized body, or apply transport `Content-Encoding`. If browser
CORS policy hides `Content-Range`, an exact-size `206` body remains supported but its starting offset
cannot be independently verified. A hidden header or a wildcard (`*`) complete size causes the
reader to use smaller exact index requests.

## Lifecycle, caching, and failures

`createBigWigFile({ url })` is synchronous and makes no request. It synchronously rejects a
non-object options value, an invalid URL, or a URL with a scheme other than HTTP(S). File format and
contents are checked lazily when `read()` or `getZoomLevels()` first needs them.

Each file object caches only successfully loaded immutable metadata: file and zoom-level metadata,
chromosome lookups including unknown names, and metadata needed to locate records at each selected
resolution. Reads and zoom discovery share completed metadata, but not in-flight work tied to one
caller's signal. Failed or aborted metadata work is not cached and can be retried. Data blocks,
decoded records, and regional results are loaded or computed for every read. Create a new file object
to refresh a URL whose content has changed.

Ordinary no-data cases return `[]`. Operations asynchronously reject for invalid regions or
resolutions, unavailable exact levels, wrong file formats, network or HTTP contract failures,
aborts, binary decode errors, and decompression errors. Failures do not become empty or partial
results, and the package does not wrap them in a package-specific error hierarchy.

## API reference

All imports come from `@weng-lab/genomic-reader`; internal package paths are not public.

### Factory and file methods

```ts
function createBigWigFile(options: BigWigFileOptions): BigWigFile;

interface BigWigFile extends GenomicFile<BigWigRecord> {
  read(region: GenomicRegion, options?: BigWigReadOptions): Promise<BigWigRecord[]>;
  getZoomLevels(options?: ReadOptions): Promise<readonly number[]>;
}
```

- `createBigWigFile(options)` synchronously validates `{ url }`, creates an instance-local cache,
  and performs no request.
- `read(region, options?)` returns overlapping source values or summaries. Omitted `resolution` is
  unzoomed.
- `getZoomLevels(options?)` returns declared reduction levels in ascending order. Its only option is
  the native `AbortSignal` supplied by `ReadOptions`.

### Public BigWig types

```ts
type BigWigFileOptions = {
  url: string;
};

type BigWigReadOptions = ReadOptions & {
  resolution?: BigWigResolution;
};

type BigWigResolution =
  | { mode: "unzoomed" }
  | { mode: "auto"; basesPerPixel: number }
  | { mode: "level"; reductionLevel: number };

type BigWigRecord = BigWigValueRecord | BigWigSummaryRecord;
type BigWigValueRecord = GenomicRecord & {
  kind: "value";
  value: number;
};
type BigWigSummaryRecord = GenomicRecord & {
  kind: "summary";
  validCount: number;
  min: number;
  max: number;
  sum: number;
  sumSquares: number;
  mean: number;
};
```

`BigWigFileOptions` accepts an absolute HTTP(S) BigWig URL. `BigWigFile` is structurally compatible
with `GenomicFile<BigWigRecord>`, while its `read()` method accepts the specialized resolution
option.

The shared public types used by these contracts are:

```ts
type GenomicRegion = {
  chromosome: string;
  start: number;
  end: number;
};

type GenomicRecord = {
  chromosome: string;
  start: number;
  end: number;
};

type ReadOptions = {
  signal?: AbortSignal;
};
```
