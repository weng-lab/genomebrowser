# BigBed reader

**Status:** Ready

## Problem

`@weng-lab/genomic-reader` has a format-independent regional-read contract but no concrete file reader. Applications need to read BigBed files directly from public HTTP(S) URLs without exposing BBI headers, trees, byte ranges, or other container details. The implementation should establish reusable private BBI machinery for a later BigWig reader without turning BBI into a public API or a broad abstraction for unrelated indexed formats.

BigBed also permits different BED widths and custom columns. The public API needs a typed way to interpret those records while retaining every decoded column after BED3. BigGenePred is a BigBed `bed12+8` schema and must not become a separate binary reader.

## Desired Outcome

Callers synchronously configure a typed BigBed file with a URL and a required Zod schema, then asynchronously read records overlapping a genomic region:

```ts
const file = createBigBedFile({
  url: "YOUR_URL_HERE",
  schema: bed3Schema,
});

const records = await file.read(region, { signal });
```

The schema is the source of the returned record type. The initial `bed3Schema` accepts every BigBed record with BED3 coordinates and retains all columns after BED3 in `fields`. Private, stateless BBI infrastructure performs strict HTTP range access, endian-aware parsing, lazy chromosome and regional-index traversal, and per-block zlib decompression.

## Current State

- `.specs/genomic-reader-foundation/spec.md` is the authoritative public API foundation. It defines `GenomicRegion`, `GenomicRecord`, `ReadOptions`, and `GenomicFile<T>` and requires sparse, sorted, coordinate-bearing results.
- `packages/reader` exports only those foundation types and has no concrete readers.
- `packages/reader/test/fixtures/bigbed/basic.bb` is a small converter-generated BED6 BigBed fixture. Its source `basic.bed`, `chrom.sizes`, and regeneration instructions are committed alongside it.
- Core still uses the old external `genomic-reader@1.4.10`, with a repository patch that fixes browser bundling and chromosome-tree offsets outside an eagerly loaded metadata range. Migration of core is separate work, but the new reader must use absolute offsets and must not repeat the eager-loading assumption.
- The UCSC BED and BigBed documentation defines BED3 coordinates as zero-based and half-open. A BigBed data record stores chromosome ID, start, and end as binary values followed by NUL-terminated, tab-separated columns after BED3.
- The old `gb-api/track/bigdata` and `~/Dev/bigwig-reader` repositories were reviewed only as behavioral and organizational references. No code may be copied from `gb-api`, whose repository has no discovered license.

## Requirements

- **R1:** The package root must export a synchronous `createBigBedFile(options)` factory. The factory must perform no network request and must synchronously reject invalid URLs or schemes other than HTTP(S).
- **R2:** Factory options must contain a public HTTP(S) `url` and a required Zod `schema`. The server must allow cross-origin range requests and expose `Content-Range` to browser JavaScript.
- **R3:** The factory must infer the file's record type from the schema output and return a `GenomicFile` whose `read()` resolves to an array of that inferred type. Callers must not need to provide a record type argument.
- **R4:** The package root must export `bed3Schema`. Its output must have exactly the required shape `{ chromosome: string, start: number, end: number, fields: string[] }`.
- **R5:** `fields` must always be an array containing all decoded columns after BED3 in source order. A BED3 record has `fields: []`; `fields` must never be `null` or `undefined`.
- **R6:** `bed3Schema` must accept records with any number of columns after BED3. It must not reject BED4-or-greater records merely because they contain more fields than it interprets.
- **R7:** The public TypeScript contract must require a supplied schema to accept decoded `{ chromosome, start, end, fields }` input and produce a flat `GenomicRecord` with `fields: string[]`. Schema authors are responsible for retaining the complete original `fields` array when adding parsed properties; the reader does not compare schema output with its input after parsing.
- **R8:** Invalid factory input must fail synchronously before a file object is returned; file contents and schema compatibility must remain unchecked until `read()` because creation performs no network work.
- **R9:** Schema parsing must be shallow and shape-oriented. The initial reader must not enforce BED domain rules such as score ranges, strand values, RGB validity, block geometry, chromosome bounds, or other semantic invariants.
- **R10:** If schema parsing fails, the read must reject with the Zod error. It must not omit the record, return partial success, convert the failure to `[]`, or introduce a package-specific error.
- **R11:** The BigBed implementation must satisfy the foundation's overlap, ordering, coordinate-preservation, non-clipping, and non-deduplication requirements. A decoded record is eligible only when its chromosome ID equals the resolved query chromosome ID and `record.start < region.end && record.end > region.start`. The emitted `chromosome` must be the queried name resolved through the chromosome tree.
- **R11a:** Final sorting must be stable by `chromosome`, `start`, and `end`: records with equal sort keys retain source decode order, including duplicate source records.
- **R12:** An unknown chromosome or a valid region with no overlapping records must resolve to `[]`.
- **R13:** Invalid regions must reject rather than resolve to `[]` or `null`. Non-numeric, non-finite, or non-integer coordinates must reject with `TypeError`; negative coordinates or `start >= end` must reject with `RangeError`. This format-specific rule intentionally treats a zero-width query as invalid rather than as an ordinary no-data read.
- **R14:** Every read must be stateless and uncached. Reusing a file object must not retain metadata, chromosome nodes, index nodes, data blocks, or regional results between reads.
- **R15:** A read's native `AbortSignal` must apply to all fetch and owned processing for that read without affecting concurrent reads on the same file. Native abort failures must be preserved. Sequential work must check cancellation before and after each fetch, decompression, and block decode; synchronous decompression, decoding, and schema parsing are not interruptible while an individual call executes.
- **R16:** Remote byte access must use browser `fetch` with a single exact `Range` request per requested span and require a valid `206 Partial Content` response.
- **R17:** Range access must reject a `200` response, a missing or inaccessible `Content-Range`, an inconsistent `Content-Range`, a response for different bytes, a body shorter or longer than the requested span, and transport-level `Content-Encoding`. It must not silently accept a server that ignored the range or returned bytes transformed in transit.
- **R18:** File offsets must retain the full unsigned 64-bit value internally using `bigint`. Conversion to number-based buffer positions is permitted only after proving the local span and position are safe JavaScript numbers.
- **R19:** The implementation must support both little-endian and big-endian BBI parsing and use the detected byte order consistently for headers, trees, indexes, and records. Big-endian support requires focused synthetic parser tests; an end-to-end big-endian fixture is not required.
- **R20:** Shared private BBI code must own range access, endian-aware binary reading, common-header parsing, chromosome lookup, regional-index traversal, block retrieval, and optional block decompression. BigBed read orchestration owns region validation, query-scoped signal handling, and coordination of the BBI and decoder layers.
- **R21:** BigBed-specific code must own BigBed magic validation, record decoding, chromosome-ID and coordinate filtering, schema parsing, and final stable result sorting. Records from another chromosome in a matched block must be skipped rather than treated as read failures.
- **R22:** Chromosome lookup and regional-index traversal must be lazy. A read must fetch only the tree nodes needed to resolve the requested chromosome and locate overlapping data blocks; it must not eagerly load whole trees or a broad metadata range. Regional-index node and leaf overlap must compare lexicographically ordered `(chromosome ID, base)` pairs rather than bare base coordinates.
- **R23:** Matching data blocks and tree nodes must initially be processed sequentially. A variable-sized node may require an exact header request followed by an exact body request after its item count is known. Nearby-range merging, read-ahead, parallel traversal, and request coalescing must not be added without measured need.
- **R24:** Compressed BBI data blocks must be decompressed with `fflate`'s zlib decompression support. Compression and decompression details must remain private, and `fflate` must be a regular runtime dependency.
- **R25:** Files must be treated as trusted while retaining necessary binary bounds checks, safe offset handling, exact HTTP response checks, and ordinary decode failures. The implementation must not add exhaustive malformed-file validation or a package error hierarchy.
- **R26:** The implementation must remain browser-compatible ESM and must not use React, genomebrowser core, Axios, Node `Buffer`, filesystem APIs, Node streams, or Node zlib APIs.
- **R27:** Zod 4 must be a peer dependency because Zod schemas cross the public package boundary, and it must also be a development dependency for building and testing the package.
- **R28:** Decoding an empty post-BED3 payload must produce `fields: []`; it must not produce `[""]`. Non-empty payloads must preserve tab-separated fields, including empty fields, in source order.
- **R29:** User-facing package documentation and the package README must document `createBigBedFile`, `bed3Schema`, schema-inferred results, regional reads, cancellation, `fields`, supported URLs, and the distinction between no-data results and failures.
- **R30:** Automated fixture coverage must include both an internally compressed BigBed and an uncompressed BigBed generated with `bedToBigBed -unc`, with source BED, chromosome sizes, and regeneration commands committed alongside each binary.
- **R31:** Chromosome IDs, genomic coordinates, counts, and other unsigned 32-bit BBI values must be decoded as unsigned values and safely represented as JavaScript numbers.
- **R32:** Lazy chromosome lookup must route through fixed-width B+ tree keys without flattening the complete tree. It must handle padded keys and internal, leaf, and multi-level trees.

## Technical Decisions

### Public schema-driven API

The initial public surface adds `createBigBedFile` and `bed3Schema`. There is no exported `BigBedRecord`, BBI type, byte source, reader class, base class, or generic format factory.

Conceptually, the factory accepts a Zod schema whose input can parse the raw decoded record and whose output extends the foundation's `GenomicRecord` with a required `fields: string[]`. The returned `GenomicFile` uses the schema's output type:

```ts
const customSchema = bed3Schema.transform((record) => ({
  ...record,
  // Future schemas may parse record.fields into additional flat properties.
}));

const file = createBigBedFile({
  url: "YOUR_URL_HERE",
  schema: customSchema,
});

const records = await file.read(region);
// records is inferred from z.output<typeof customSchema>
```

The binary decoder produces one raw object at a time:

```ts
{
  chromosome,
  start,
  end,
  fields,
}
```

The schema immediately parses that object during record decoding, and its output is appended to the result array before the final stable sort. This avoids a separate schema-only pass, although it remains an internal design choice rather than an observable public guarantee. `fields` contains only columns after BED3 because the first three values are already represented by `chromosome`, `start`, and `end`. An empty post-BED3 payload becomes `[]`; otherwise tab-separated values, including empty values, are retained in source order. Extra columns are preserved even when the selected schema does not interpret them. A future BED6 schema may require and parse the first three entries in `fields`; using that schema on records with fewer fields fails, while using `bed3Schema` on BED6 or wider records succeeds.

### Private BBI boundary

The private read path is:

```text
exact HTTP ranges
  → endian-aware binary parsing
  → common BBI header
  → lazy chromosome lookup
  → lazy regional-index traversal
  → matching compressed or uncompressed blocks
  → BigBed record decoding and schema parsing
```

The BBI layer returns decompressed data-block bytes with only the offset, size, and query/index context needed by a format decoder. It does not assume the BigBed record layout and does not know about Zod, BED fields, public record types, or final sorting. BigBed does not own HTTP semantics or tree traversal. This boundary leaves room for later BigWig decoders and metadata needs without exposing BBI publicly.

Each `read()` validates its region, creates its own query-scoped state, and begins by fetching the 64-byte common BBI header. It validates BigBed magic, detects byte order, resolves the requested chromosome through a key-directed B+ tree lookup, traverses only overlapping nodes in the primary regional R-tree, and fetches each matching data block. R-tree bounds are genomic positions ordered by chromosome ID and then base; a block may span chromosomes. BigBed therefore skips decoded records whose chromosome ID differs from the query before applying coordinate overlap. Absolute offsets from the file are never interpreted relative to an unrelated fetched buffer.

The first implementation does not fetch or interpret zoom data, AutoSQL text, or extra indexes. It may parse header fields or offsets needed to navigate safely, but these concepts are not exposed publicly. BigWig can later reuse the private range, binary, header, chromosome, index, compression, and block machinery while supplying its own decoders and public API.

### HTTP and offsets

Range requests use inclusive HTTP byte bounds derived from an internal offset and length. The response must prove that it contains exactly the requested original file bytes through status, an exposed `Content-Range`, absence of transport `Content-Encoding`, and body length. A server returning the complete resource with `200 OK` is unsupported, even when the requested bytes could be sliced from that body, because doing so can unexpectedly download a very large file.

Unsigned 64-bit file offsets remain `bigint` through parsing, comparisons, arithmetic, and HTTP range construction. DataView cursor positions and allocated byte lengths remain numbers and require explicit safe-range checks. Ordinary fetch and decode errors propagate without translation.

### Compression

The common BBI header determines whether data blocks are compressed. Compressed blocks are independent zlib-wrapped DEFLATE payloads and are inflated with `fflate`. Uncompressed blocks pass through unchanged. The initial implementation uses synchronous whole-block decompression because BBI blocks are independently fetched and decoded; it does not introduce browser streams, workers, or WebAssembly.

## Verification Strategy

- Use `packages/reader/test/fixtures/bigbed/basic.bb` as the primary deterministic fixture. Verify it against the committed BED6 source and chromosome sizes, including both chromosomes, overlapping records, exact half-open boundaries, chromosome edges, and reads with no data.
- Read the BED6 fixture with `bed3Schema` and verify that every BED4-BED6 value remains in `fields` in source order while the inferred result type is the schema output.
- Verify schema inference at compile time with a custom schema that adds flat properties, and verify at runtime that too few fields or another shape mismatch rejects with a Zod error rather than returning partial results.
- Verify sorting, exact overlap filtering, original coordinates, and duplicate preservation. Duplicate behavior may use a focused decoder fixture or test rather than altering `basic.bb`.
- Exercise HTTP through a deterministic mock range endpoint. Assert requested byte ranges and request order, valid `206` handling, exact `Content-Range` and body lengths, rejection of ignored-range `200` responses, short or oversized responses, ordinary network failures, and cancellation.
- Verify rejection when `Content-Range` is absent or unavailable to browser JavaScript and when a partial response declares transport-level `Content-Encoding`.
- Assert that factory creation performs no request and that two reads of the same file repeat metadata/index work rather than sharing state. Verify concurrent reads use independent signals.
- Verify lazy absolute-offset traversal, including a chromosome-tree node located outside the initial header range, so the old external reader's offset bug cannot recur.
- Verify key-directed chromosome lookup through padded fixed-width keys and a multi-level B+ tree without fetching unrelated branches.
- Add focused coverage for an R-tree leaf or data block spanning chromosome IDs. Verify pairwise chromosome/base overlap and that records from neighboring chromosomes are skipped before coordinate filtering.
- Cover compressed and uncompressed block handling and compare decoded records with a trusted converter or `bigBedToBed` output.
- Commit a second fixture generated with `bedToBigBed -unc` and document its exact regeneration command beside the existing internally compressed fixture.
- Use focused binary tests for both byte orders, unsigned 32-bit values, unsigned 64-bit offsets, local buffer bounds, common-header parsing, chromosome-tree nodes, and regional-index overlap boundaries. Big-endian coverage is synthetic parser coverage; the converter-generated end-to-end fixtures may remain little-endian.
- Keep any full real BigBed file supplied for broader manual or optional integration verification out of the routine deterministic suite unless its size and redistribution terms make committing it appropriate.
- Verify the package build remains browser ESM with declarations and sourcemaps, declares Zod 4 as a peer and development dependency, and includes `fflate` as its only new private runtime implementation dependency.
- Verify the package README and self-contained package documentation use only public exports and accurately document the shipped BigBed API and failure behavior.

## Out of Scope

- BigWig decoding, zoom-level selection, summary records, or a public BBI API.
- Built-in BED4 through BED12, BigGenePred, AutoSQL-derived, or custom named-field schemas beyond the initial `bed3Schema`.
- Automatic AutoSQL parsing, schema generation, or checking a supplied Zod schema against file metadata before records are read.
- BigGenePred as a separate container or factory.
- Extra-index lookup by name or other non-regional keys.
- Metadata, chromosome-tree, index-node, block, result, cross-read, or global URL caching.
- Parallel block requests, read-ahead, range merging, request coalescing, retries, or speculative prefetching.
- Servers that ignore range requests, authenticated resources, custom headers, caller-provided `fetch`, local `File` or `Blob` inputs, filesystem access, FTP, or custom byte sources.
- Clipping, normalization, chromosome aliases, coordinate conversion, assembly lookup, deduplication, or BED domain validation.
- Exhaustive malformed-file validation, security hardening for hostile files, or a package-specific error hierarchy.
- Migration of core BigBed, BigWig, or methylation tracks from the old external `genomic-reader` dependency, and removal of that dependency's repository patch.

## Risks and Edge Cases

- Stateless lazy reads may issue many small HTTP requests and repeat header/tree work. This is an accepted simplicity and correctness tradeoff; optimization requires real request and latency measurements.
- Some otherwise reachable servers return `200` for range requests. They are intentionally unsupported to avoid accidental whole-file downloads.
- Some CORS-enabled servers do not expose `Content-Range`, and some intermediaries apply transport compression. Those responses cannot prove exact original-file byte ranges in browser JavaScript and are intentionally unsupported.
- Zod schemas can transform values. Custom schema authors are responsible for returning the complete flat record and retaining the original `fields`; schemas that cannot produce the required output shape are invalid for this factory.
- A schema requiring more columns than a particular record contains fails only when that record is read. Factory creation cannot detect the mismatch because it performs no network work, and an empty regional result has no record to validate.
- Treating input as trusted means malformed headers, trees, compressed blocks, or records may fail with low-level ordinary errors rather than stable diagnostics.
- Lazy key-directed chromosome lookup is less common in the reviewed reference implementations, which eagerly flatten the chromosome tree. It requires focused routing tests against the documented BBI B+ tree layout.
- Supporting both byte orders adds focused parser coverage, but real converter-generated fixtures are likely to exercise only little-endian files.
- JavaScript buffers use number-based lengths and positions even though BBI offsets are 64-bit. Keeping absolute offsets as `bigint` and checking every conversion avoids precision loss but does not make impractically large individual allocations possible.
