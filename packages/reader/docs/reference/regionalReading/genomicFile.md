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

This structural interface describes a regional read and its result type. There is no base class to construct or inherit. Format-specific file types supply the record shape; BigWig additionally exposes zoom methods. Keep a file instance to reuse its metadata. Built-in factories validate their options synchronously and defer network access until an operation needs it.

The interface does not enforce coordinate conventions, clipping, sorting, caching, or validation on custom implementations. Consult each format's contract for those behaviors: [BigWig](../bigWig/bigWig.md), [BigBed](../bigBed/bigBed.md), and [TwoBit](../twoBit/twoBit.md).

## GenomicRegion

```ts
type GenomicRegion = {
  chromosome: string;
  start: number;
  end: number;
};
```

Identifies the chromosome or contig and requested interval. Sequence names are supplied as strings. Coordinate interpretation belongs to the selected reader.

## GenomicRecord

```ts
type GenomicRecord = {
  chromosome: string;
  start: number;
  end: number;
};
```

Defines the coordinate fields required on returned records. It has the same structural shape as `GenomicRegion` but names the result role. Format-specific records extend it with signal, annotation, or sequence data.

## ReadOptions

```ts
type ReadOptions = { signal?: AbortSignal };
```

The optional `signal` defaults to no caller-provided cancellation. Built-in regional readers scope cancellation to the operation receiving that signal. Aborting one operation does not cancel another operation on the same file instance. Failed reads reject their promise rather than returning partial data. BigWig also accepts these options for zoom-level discovery and zoom reads.

[Regional reading index](README.md) · [All reader APIs](../README.md)
