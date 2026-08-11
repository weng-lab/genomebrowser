# Regional BigBed reader

**Status:** Ready

## Problem

Genome browser tracks need a browser-safe way to read only the records overlapping a genomic region from a remote BigBed file. The existing external reader exposes lower-level loader machinery, depends on Node-oriented compatibility shims, and contains behavior that the monorepo currently repairs with a package patch. The new `@weng-lab/genomic-reader` package is scaffolded but has no source or public API.

## Desired Outcome

`@weng-lab/genomic-reader` provides a small, high-level BigBed API: a caller creates a file from a URL and reads typed records for zero-based, half-open genomic regions. Networking, binary indexes, range requests, decompression, and format decoding remain internal. The first implementation prioritizes correctness and maintainability over cross-read caching or support for additional genomic formats.

## Current State

- `packages/reader` contains package, TypeScript, Vite, and Vitest configuration but no source files.
- Core currently reads BigBed through the external `genomic-reader@1.4.10` package, Axios, and a browser `Buffer` shim.
- A workspace patch fixes browser filesystem resolution and chromosome trees located beyond the initially fetched header bytes.
- The planned package boundary places low-level genomic file reading in `@weng-lab/genomic-reader`. A future first-party tracks package may consume it; core must not become coupled to reader implementations.
- BigBed guarantees chromosome, start, and end fields. Remaining BED and custom fields are positional and may be interpreted according to a known schema such as BED6, BED12, or BigGenePred.

## Requirements

- **R1:** The package must export a `createBigBedFile` factory that accepts an options object containing a remote HTTP(S) `url` and returns a file object with an asynchronous `read` method.
- **R2:** `read` must accept a single-chromosome region shaped as `{ chromosome, start, end }`, interpreted as zero-based and half-open.
- **R3:** `read` must accept an optional `AbortSignal` and apply it to network work owned by that read.
- **R4:** Each `read` must use the BigBed chromosome and data indexes to request only bytes required to resolve the region. It must not intentionally download the complete file.
- **R5:** A raw record must have the shape `{ chromosome, start, end, rest }`, where `rest` is a `string[]` containing column four onward in source order. A record with no additional columns has an empty `rest` array.
- **R6:** The file options may provide a generic `parseRest` function. It receives the raw `rest` fields and returns additional typed fields. Parsed `read` results combine those fields with reader-owned `chromosome`, `start`, and `end` coordinates.
- **R7:** The generic factory types must infer parsed result fields from the return type of `parseRest`. Callers must not need a type assertion for an ordinary parser.
- **R8:** Reader-owned coordinates must remain authoritative. Parser output must not replace the decoded chromosome, start, or end.
- **R9:** Returned records must overlap the query according to `record.start < region.end && record.end > region.start`.
- **R10:** An unknown chromosome must return an empty array. Empty chromosome names, unsafe or negative coordinates, reversed regions, and zero-width regions must fail before regional data decoding.
- **R11:** The reader must validate that the remote file is BigBed and fail clearly for incompatible, malformed, truncated, or unsupported files.
- **R12:** The reader must support BigBed byte order declared by the file and both compressed and uncompressed data blocks.
- **R13:** Chromosome-tree data must be read from its declared file offset even when it is not contained in the initial header response.
- **R14:** The HTTP implementation must issue byte-range requests and require a valid partial response. A server response that ignores the range and returns the complete resource must fail rather than silently downloading the file.
- **R15:** A short or inconsistent byte-range response must fail rather than being decoded as complete data.
- **R16:** Binary parsing must use browser-native typed arrays and must not require Node `Buffer`, `fs`, streams, Axios, or global compatibility shims.
- **R17:** The implementation must not retain headers, indexes, blocks, decoded records, or file instances between separate `read` calls. Work may be shared or deduplicated within one read operation.
- **R18:** Networking, binary decoding, decompression, index traversal, and record parsing must have separable internal boundaries so they can be tested without public dependency-injection APIs or live network services.
- **R19:** The package root must export only the intended high-level factory, file/options/result types, parser type, read options, and errors required to handle supported failures. Internal byte readers, indexes, cursors, and decompression utilities must not be package-root exports.

## Technical Decisions

### Public API

The primary usage is:

```ts
const file = createBigBedFile({
  url: "YOUR_URL_HERE",
});

const records = await file.read({
  chromosome: "chr1",
  start: 1_000_000,
  end: 1_100_000,
});
```

Supplying `parseRest` changes the returned record type without changing regional reading:

```ts
const file = createBigBedFile({
  url: "YOUR_URL_HERE",
  parseRest(rest) {
    return {
      name: rest[0],
      score: Number(rest[1]),
      strand: rest[2],
    };
  },
});
```

The public API uses a factory and a small returned object rather than public classes, loader hierarchies, or constructors. The region shape may remain inline in reader-facing signatures so the reader does not depend on core or introduce a shared types package. Core's structurally compatible `GenomicRegion` can be passed directly by a future track package.

### Read lifecycle

The factory binds URL and parser configuration but performs no network request. Every `read` independently:

1. Reads and validates the BigBed header.
2. Loads the chromosome tree from its declared location and resolves the chromosome.
3. Traverses the regional data index to identify overlapping blocks.
4. Deduplicates required blocks within the operation.
5. Fetches, decompresses when necessary, and decodes those blocks.
6. Filters decoded records using half-open overlap semantics.
7. Returns raw records or applies `parseRest` and returns typed records.

The initial reader keeps no stateful metadata cache. Internal dependencies should be passed or composed where that makes boundaries clearer, but the implementation must not introduce a general dependency container or abstract framework solely for stylistic consistency.

### Field interpretation

The reader owns binary decoding and the first three positional fields. It splits remaining tab-delimited content into `rest` while preserving field order and empty fields. It does not infer semantic names or types.

`parseRest` is configured per file because a BigBed file has one stable column layout. Standard BED and domain-specific parsers may be added later by composing this mechanism. Parser failures fail the containing `read`; partial parsed results are not returned.

### Transport and runtime

The initial runtime is a browser with `fetch`, typed arrays, and HTTP(S) range access. Remote resources are assumed to be public and CORS-enabled. The implementation may choose a small browser-compatible decompression dependency, but that dependency is not part of the public contract.

The first implementation requires a `206 Partial Content` response for byte reads. It does not fall back to a complete download when range requests are unsupported.

## Verification Strategy

- Use small committed BigBed fixtures and an internal in-memory range reader to verify binary behavior deterministically.
- Cover little-endian and big-endian headers, compressed and uncompressed blocks, chromosome trees outside the initial header range, and records with zero, standard, empty, and custom trailing fields.
- Verify exact half-open overlap boundaries, unknown chromosomes, invalid regions, absent blocks, duplicate index chunks, and malformed or truncated binary structures.
- Add compile-time coverage proving raw result types and inference from `parseRest`, including protection of reader-owned coordinate fields.
- Test the HTTP boundary with controlled `fetch` responses for correct `Range` headers, `206` responses, short bodies, ignored ranges returning `200`, HTTP failures, CORS-like fetch rejection, and cancellation.
- Verify repeated `read` calls perform fresh metadata reads, while duplicate work discovered within one read is deduplicated.
- Verify the built package is ESM, emits declarations and sourcemaps, and does not include or require Node built-ins, Axios, or Buffer shims.

## Out of Scope

- Metadata, byte-range, decoded-record, global URL, or file-instance caching across reads.
- Integration into core or migration of existing BigBed tracks.
- Creation of the future first-party tracks package.
- BigWig, BigGenePred, GTF, GFF, BGZF, Tabix, BAM, 2bit, local file, FTP, or Node-specific readers.
- Built-in BED3, BED4, BED5, BED6, BED12, BigGenePred, or other domain parsers.
- AutoSQL parsing, schema inference, or schema-derived TypeScript types.
- Authenticated requests, custom headers, custom `fetch`, signed-request hooks, or public byte-source injection.
- Full-file fallback for servers without HTTP range support.
- Streaming, background prefetching, persistent storage, workers, or concurrency tuning beyond correctness safeguards.
- Compatibility exports or adapters for `genomic-reader@1.x`.

## Risks and Edge Cases

- Re-reading headers and indexes on every viewport change adds latency and network traffic. This is an accepted first-pass tradeoff; the file-object API leaves room for instance-local metadata caching later.
- Some HTTP servers advertise files but ignore range requests. Rejecting them is safer than downloading a potentially multi-gigabyte file but reduces compatibility.
- BigBed indexes can reference the same data block through multiple traversal paths; failing to deduplicate within a read could duplicate records and network work.
- BigBed files may contain embedded AutoSQL schemas or more fields than standard BED variants. The initial reader deliberately treats all trailing fields as positional strings.
- Parser functions can return invalid domain values such as `NaN`; semantic validation belongs to the parser supplied by the caller.
- Cancellation can occur between dependent range requests. The read must stop subsequent work and must not return partial records.
- Binary offsets and sizes may exceed ordinary 32-bit integer ranges. Parsing must avoid truncating valid file offsets while rejecting values unsafe to represent correctly in JavaScript.
