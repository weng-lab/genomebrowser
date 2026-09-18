# 2bit reference sequence

Use `createTwoBitFile` to read reference DNA from a UCSC version-0 2bit file over HTTP(S). Reads use zero-based, half-open coordinates.

```ts
import { createTwoBitFile } from "@weng-lab/genomic-reader";

const file = createTwoBitFile({ url: "YOUR_URL_HERE" });
const records = await file.read({ chromosome: "chr1", start: 100, end: 120 });
// [{ chromosome: "chr1", start: 100, end: 120, sequence: "..." }]
```

| API                           | Type                                         | Behavior                                                          |
| ----------------------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| `createTwoBitFile(options)`   | `(options: TwoBitFileOptions) => TwoBitFile` | Requires an HTTP(S) `url`; construction performs no requests.     |
| `file.read(region, options?)` | `Promise<TwoBitRecord[]>`                    | Accepts `GenomicRegion` and optional `ReadOptions` with `signal`. |
| `TwoBitRecord`                | `GenomicRecord & { sequence: string }`       | Sequence length equals `end - start`.                             |
| `TwoBitFile`                  | `GenomicFile<TwoBitRecord>`                  | Reuse an instance to retain index and chromosome metadata.        |

## Sequence output

Unknown blocks become `N`. Soft-masked blocks become lowercase, including `n` where masks overlap unknown bases. Bases stay in forward-reference order.

Missing chromosomes and requests entirely beyond a sequence return `[]`. An overlapping request is clipped to its sequence end.

## Caching and cancellation

The reader caches successful metadata per file instance, then requests only the packed bytes covering each region. It does not cache sequence results.

Cancellation applies only to the read being cancelled. Cancelling one read does not affect later reads. Invalid regions, unsupported versions, malformed metadata, truncated data, and range failures reject the read.

## Server and format requirements

The server must support byte ranges and browser CORS, with exact-size `206 Partial Content` responses. Exposing `Content-Range` allows offset verification but is optional.

Both byte orders are supported. Local filesystem paths, compressed 2bit files, and version-1 64-bit indices are not supported.

## Public types and methods

Import all APIs here from `@weng-lab/genomic-reader`.

```ts
type TwoBitFileOptions = { url: string };
type TwoBitRecord = GenomicRecord & { sequence: string };
type TwoBitFile = GenomicFile<TwoBitRecord>;

function createTwoBitFile(options: TwoBitFileOptions): TwoBitFile;
// file.read(region: GenomicRegion, options?: ReadOptions): Promise<TwoBitRecord[]>
```

### createTwoBitFile and TwoBitFileOptions

`url` is required and must be an absolute HTTP(S) URL. Invalid options or URLs throw synchronously. File contents are validated lazily by `read()`.

### TwoBitFile and TwoBitRecord

`read()` returns either an empty array or one record with the requested start and an end clipped to the sequence length. `sequence` contains the forward-reference bases for that interval. Coordinates must be finite nonnegative integers with `start < end`; invalid regions reject asynchronously. The optional `ReadOptions.signal` has no default signal.

Successful index and sequence metadata are cached on the file object. Failed metadata loads can be retried; create a new file instance when the URL's contents change. HTTP, decoding, and abort failures reject rather than returning partial sequence.

## Related reference

[Shared regional contract](../regionalReading/genomicFile.md) · [TwoBit sequence index](README.md) · [All reader APIs](../README.md)
