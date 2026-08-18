# Genomic reader foundation

**Status:** Ready

## Problem

The genomic reader package needs a stable public identity and contract before it grows file-format implementations. Its purpose is not to expose byte readers, indexes, or container formats. Callers need to configure a genomic file and ask what data overlaps a genomic region, while each file implementation privately handles its own remote resources, indexing strategy, binary or text encoding, and format-specific options.

The package is scaffolded but currently has no source or public API. A previous BigBed-first design coupled the package foundation to one format family and added low-level machinery before the common API was settled.

## Desired Outcome

`@weng-lab/genomic-reader` defines a small, format-independent TypeScript contract for files that return sparse, coordinate-bearing records by genomic region. Applications can consume any conforming file through the same `GenomicFile<T>` interface, while later specifications add format-specific factories and hidden implementation families such as BBI or Tabix.

## Current State

- `packages/reader` contains package, TypeScript, Vite, and Vitest configuration, but `src` and `test` are empty.
- Its README already identifies the intended package as `@weng-lab/genomic-reader`, while `package.json` still names it `@weng-lab/genomebrowser-reader`.
- Core defines a structurally similar genomic region type, but the reader package must remain independent and may define the types needed by its own API.
- Core track fetch functions are currently stateless. The foundation does not introduce cross-fetch file lifecycles or caching.
- Initial file implementations will target public, CORS-enabled HTTP(S) resources through browser-native APIs.

## Requirements

- **R1:** The package must be named `@weng-lab/genomic-reader` and expose its supported API from the package root.
- **R2:** The package root must export `GenomicRegion`, `GenomicRecord`, `ReadOptions`, and `GenomicFile<T>` types.
- **R3:** `GenomicRegion` must have the shape `{ chromosome: string, start: number, end: number }`. Coordinates are zero-based and half-open.
- **R4:** `GenomicRecord` must provide the same required `chromosome`, `start`, and `end` fields. Format-specific records may add flat fields of any shape, including nested values within those fields.
- **R5:** `GenomicFile<T>` must accept a record type extending `GenomicRecord` and expose an asynchronous `read(region, options?)` method returning `Promise<T[]>`.
- **R6:** `ReadOptions` must accept an optional native `AbortSignal` named `signal`. The signal applies only to work owned by that read, and aborting one read must not abort another concurrent read on the same file.
- **R7:** A successful read must return only records overlapping the requested region according to `record.start < region.end && record.end > region.start`.
- **R8:** Successful results must be sorted by `chromosome`, then `start`, then `end`.
- **R9:** Returned records must preserve their decoded coordinates and format-specific data. The common layer must not clip records to the query, deduplicate source records, normalize their fields, or validate their domain values.
- **R10:** An unknown chromosome, a region with no overlapping records, or another ordinary absence of data must return an empty array rather than fail.
- **R11:** The foundation must not define a package-specific error hierarchy. Implementations preserve native abort failures, propagate network failures, and may throw ordinary errors when trusted input cannot be read or decoded.
- **R12:** The foundation must not require exhaustive input-region or file-format validation. Later implementations may perform the bounds and response checks necessary to execute safely, but files are otherwise treated as trusted input.
- **R13:** A private dummy `GenomicFile` implementation must demonstrate and verify the public contract without becoming a package-root export.
- **R14:** The package must build as browser-compatible ESM with declarations and sourcemaps and must not depend on React, genomebrowser core, Axios, Node `Buffer`, filesystem APIs, or Node streams.

## Technical Decisions

### Common API

The foundational contract is:

```ts
export type GenomicRegion = {
  chromosome: string;
  start: number;
  end: number;
};

export type GenomicRecord = {
  chromosome: string;
  start: number;
  end: number;
};

export type ReadOptions = {
  signal?: AbortSignal;
};

export interface GenomicFile<T extends GenomicRecord> {
  read(region: GenomicRegion, options?: ReadOptions): Promise<T[]>;
}
```

The interface is intentionally structural. Tests, applications, and later format packages can provide conforming objects without extending a base class or using a registration mechanism.

### Format-specific files

Future creation APIs are format-specific and always accept options objects:

```ts
const bigBed = createBigBedFile({ url: "YOUR_URL_HERE" });
const bigWig = createBigWigFile({ url: "YOUR_URL_HERE" });
const gtf = createGtfFile({
  url: "YOUR_URL_HERE",
  indexUrl: "YOUR_URL_HERE",
});
```

Factories configure a file synchronously and perform no network work during creation. Stable format properties and supporting resources belong in factory options. Query-specific behavior belongs in read options. Concrete file types may extend the common read options with capabilities meaningful to that format, such as a requested BigWig resolution, without adding those options to every `GenomicFile`.

There is no generic `createGenomicFile`, format registry, base file class, or public byte-source interface. Callers choose a format factory, while format detection, supporting indexes, and byte access remain implementation details.

### Internal format families

Later specifications may share internals where the file formats genuinely share a container or indexing strategy:

- BigBed and BigWig use shared BBI infrastructure and different format-specific decoding.
- BigGenePred is interpreted as a BigBed schema rather than a separate binary container.
- Indexed GTF or GFF may use a separate Tabix/BGZF implementation family and require a supporting index URL.

These internal families must not change the common regional-file contract or expose byte-oriented operations to callers.

### Lifecycle and trust

Reads are stateless and uncached initially. The API permits a file object to be reused, but the foundation does not introduce metadata caches, global resource stores, cross-read request deduplication, or browser track lifecycle changes. Those optimizations can be added later behind the same API when real integration behavior justifies them.

Files are treated as trusted. Implementations should remain bounds-safe and avoid unsafe or unintended network behavior, but they do not need to prove every binary-tree invariant, classify every malformed file, or translate failures into a comprehensive package error taxonomy.

## Verification Strategy

- Add compile-time coverage showing that format-specific records retain their inferred fields while satisfying the required coordinates.
- Use a private dummy factory in a test file to demonstrate construction, structural conformance, asynchronous regional reads, empty results, sorting, overlap filtering, and forwarding an optional signal.
- Verify that two concurrent dummy reads receive independent signals.
- Verify package-root exports include only the intended foundation types and do not expose the dummy implementation.
- Verify the built package is ESM, emits declarations and sourcemaps, and introduces no React, core, Axios, Buffer, filesystem, or Node-stream dependency.

## Out of Scope

- BigBed, BigWig, BigGenePred, GTF, GFF, BBI, Tabix, BGZF, BAM, 2bit, or any other concrete file implementation.
- Public format factories or format-specific record and option types.
- Binary parsing, range fetching, decompression, index traversal, record decoding, and file detection.
- Local files, browser `File` or `Blob`, authenticated requests, custom headers, caller-provided `fetch`, and custom byte sources.
- Metadata, index, block, regional-result, file-instance, or global URL caching.
- Core track-module lifecycle changes or integration into existing tracks.
- A generic factory, format registry, dependency container, base class, mock package export, or compatibility API for earlier reader packages.
- Assembly lookup, chromosome aliases, liftover, coordinate conversion, chromosome-size clamping, clipping, source-record deduplication, or domain-value validation.

## Risks and Edge Cases

- Stateless reads may repeat metadata and index work. This is an accepted initial tradeoff; future instance-local caching requires consumers to retain file instances across reads.
- Treating files as trusted means malformed input may fail with low-level parsing or decompression errors rather than stable package-specific diagnostics.
- A minimal common interface cannot express every format capability. Concrete file types may add optional read behavior while remaining usable as `GenomicFile<T>`.
- The reader package duplicates a small structural region type already present in core. This is intentional and avoids coupling the reusable reader to the genome browser runtime.

## Amendments

### A001 - BigBed factory requires a schema

- **Supersedes:** The `createBigBedFile` example in **Format-specific files**.
- **Replacement:** BigBed creation requires a Zod schema that determines the returned record type:

  ```ts
  const bigBed = createBigBedFile({
    url: "YOUR_URL_HERE",
    schema: bed3Schema,
  });
  ```
