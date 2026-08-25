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

`read()` returns `BigWigValueRecord` objects containing the source signal values stored by the
file:

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
read a zoom level explicitly when displaying a wide view.

## Read a zoom level

A reduction level is a file-declared genomic summary scale measured in bases. Larger levels are
coarser. Sparse data and summary boundaries mean returned records need not each span exactly the
level's number of bases or align one-for-one with that width.

`getZoomLevels()` returns every reduction level declared by the file as an ascending readonly array.
The array is empty when the file has no zoom levels. Pass one of those values to `readZoomLevel()`
when you need summarized records for a wide view:

```ts
import { createBigWigFile } from "@weng-lab/genomic-reader";

const file = createBigWigFile({ url: "YOUR_URL_HERE" });
const region = { chromosome: "chr1", start: 0, end: 1_000_000 };
const zoomLevels = await file.getZoomLevels();
const reductionLevel = zoomLevels.at(-1);

if (reductionLevel !== undefined) {
  const records = await file.readZoomLevel(region, reductionLevel);
}
```

A `reductionLevel` must be a positive integer and must exactly match an available level. An
unavailable level rejects; the reader does not substitute a nearby level or silently use unzoomed
data.

This method targets a useful source resolution for the chosen level. It is not a hard result-count
cap: the reader does not aggregate again, force one record per pixel, or promise any particular
record count. File-defined summaries may be sparse and need not align with display pixels.

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
single value. `mean` uses ordinary JavaScript division. Use `read()` for work that requires source
measurements; zoom summaries cannot reconstruct those measurements.

`BigWigRecord` is the union `BigWigValueRecord | BigWigSummaryRecord`. Code that handles both record
kinds, such as a display layer fed from either method, can narrow the union with `kind`:

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
order. An unknown chromosome or a valid region with no overlapping data resolves to `[]`.

Coordinates must be finite nonnegative integers, and `start` must be less than `end`. Invalid
coordinates reject instead of returning an empty result.

## Cancel an operation

Pass a native `AbortSignal` in the options of `read()`, `readZoomLevel()`, or `getZoomLevels()`:

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
contents are checked lazily when `read()`, `readZoomLevel()`, or `getZoomLevels()` first needs them.

Each file object caches only successfully loaded immutable metadata: file and zoom-level metadata,
chromosome lookups including unknown names, and metadata needed to locate records at each reduction
level. Reads and zoom discovery share completed metadata, but not in-flight work tied to one
caller's signal. Failed or aborted metadata work is not cached and can be retried. Data blocks,
decoded records, and regional results are loaded or computed for every read. Create a new file object
to refresh a URL whose content has changed.

Ordinary no-data cases return `[]`. Operations asynchronously reject for invalid regions or
reduction levels, unavailable reduction levels, wrong file formats, network or HTTP contract failures,
aborts, binary decode errors, and decompression errors. Failures do not become empty or partial
results, and the package does not wrap them in a package-specific error hierarchy.

## API reference

All imports come from `@weng-lab/genomic-reader`; internal package paths are not public.

### Factory and file methods

```ts
function createBigWigFile(options: BigWigFileOptions): BigWigFile;

interface BigWigFile extends GenomicFile<BigWigValueRecord> {
  read(region: GenomicRegion, options?: ReadOptions): Promise<BigWigValueRecord[]>;
  readZoomLevel(
    region: GenomicRegion,
    reductionLevel: number,
    options?: ReadOptions,
  ): Promise<BigWigSummaryRecord[]>;
  getZoomLevels(options?: ReadOptions): Promise<readonly number[]>;
}
```

- `createBigWigFile(options)` synchronously validates `{ url }`, creates an instance-local cache,
  and performs no request.
- `read(region, options?)` returns overlapping source values for the region.
- `readZoomLevel(region, reductionLevel, options?)` returns overlapping zoom summaries stored at an
  exact declared reduction level. It rejects when the file does not declare that level.
- `getZoomLevels(options?)` returns declared reduction levels in ascending order. Its only option is
  the native `AbortSignal` supplied by `ReadOptions`.

### Public BigWig types

```ts
type BigWigFileOptions = {
  url: string;
};

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
with `GenomicFile<BigWigValueRecord>`.

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
