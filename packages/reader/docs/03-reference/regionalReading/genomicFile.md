# Regional file contract

Import these types from `@weng-lab/genomic-reader` when writing code that accepts a regional reader independently of its file format.

## Usage

```ts
import type { GenomicFile, GenomicRecord, GenomicRegion } from "@weng-lab/genomic-reader";

type NamedRecord = GenomicRecord & { name: string };

async function readNames(file: GenomicFile<NamedRecord>, region: GenomicRegion) {
  return (await file.read(region)).map((record) => record.name);
}
```

## GenomicFile

```ts
interface GenomicFile<T extends GenomicRecord> {
  read(region: GenomicRegion, options?: ReadOptions): Promise<T[]>;
}
```

This structural interface describes a regional read and its result type. There is no base class to construct or inherit. Format-specific file types supply the record shape; BigWig also exposes zoom methods. Keep a file instance to reuse its metadata. Built-in factories validate their options synchronously and defer network access until an operation needs it.

The interface does not enforce coordinate conventions, clipping, sorting, caching, or validation on custom implementations. Consult each format's contract for those behaviors: [BigWig](../bigWig/bigWig.md), [BigBed](../bigBed/bigBed.md), [BAM](../bam/bam.md), and [TwoBit](../twoBit/twoBit.md).

## HTTP byte ranges and caching

Built-in BigBed, BigWig, BAM, and TwoBit readers fetch byte ranges with `cache: "no-store"`. This bypasses browser HTTP caches that can return corrupted partial responses even with a valid `206` status and matching body length. Responses still undergo range and length validation.

File instances retain their format-specific metadata caches. Reusing an instance avoids repeated metadata requests, while requested data ranges are fetched from the source.

## GenomicRegion

```ts
type GenomicRegion = {
  chromosome: string;
  start: number;
  end: number;
};
```

Identifies the chromosome or contig and requested region. Sequence names are supplied as strings. Coordinate interpretation belongs to the selected reader.

## GenomicRecord

```ts
type GenomicRecord = {
  chromosome: string;
  start: number;
  end: number;
};
```

`GenomicRecord` describes a returned record using the same coordinate fields as `GenomicRegion`. Format-specific records extend it with signal, annotation, or sequence data.

## ReadOptions

```ts
type ReadOptions = { signal?: AbortSignal };
```

The optional `signal` defaults to no caller-provided cancellation. Built-in regional readers scope cancellation to the operation receiving that signal. Aborting one operation does not cancel another operation on the same file instance. Failed reads reject their promise rather than returning partial data. BigWig also accepts these options for zoom-level discovery and zoom reads.

## HttpStatusError

```ts
class HttpStatusError extends Error {
  readonly status: number;
  constructor(message: string, status: number);
}
```

Every reader, including `readChromSizes` and `readCytobands`, rejects with `HttpStatusError` when a response has a status it cannot use. Check `status` to report the cause without parsing messages: for example 404 for a missing file, 403 for a private one, or 200 when a host answers a range request with the whole file because it does not support ranges.

```ts
import { HttpStatusError } from "@weng-lab/genomic-reader";

function describeFailure(error: unknown): string {
  if (error instanceof HttpStatusError) {
    if (error.status === 200) return "The host does not support range requests.";
    if (error.status === 404) return "The file was not found.";
    return `The host returned HTTP ${error.status}.`;
  }
  return error instanceof Error ? error.message : String(error);
}
```

Network failures, including requests that CORS blocks, reject with the `TypeError` from `fetch`, because the browser does not reveal a status. A response with a usable status that holds the wrong kind of file rejects with the errors described on each format's page. Aborts reject with the signal's reason.

[Regional reading index](README.md) · [All reader APIs](../README.md)
