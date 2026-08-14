# Ticket 04: Implement the public BigWig reader

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R1-R28, R30-R31
**Blocked by:** Ticket 01, Ticket 02, Ticket 03

## Outcome

Consumers can create a reusable `BigWigFile`, discover its reduction levels, and perform validated unzoomed, automatically selected, or exact-level regional reads through the package API with correct records, caching, cancellation, and failure behavior.

## Scope

Add the public BigWig types and synchronous factory. Implement BigWig read orchestration over the shared BBI zoom/index support and format decoders. Implement deterministic resolution validation and selection, zoom-level discovery, wrong-format rejection, stable results, and successful instance-local metadata caches for the common header, zoom headers, chromosome lookups, and selected R-tree headers.

Add public API, resolution-policy, fixture-backed integration, HTTP-range, cache-lifecycle, retry, concurrency, cancellation, and regression tests. Export the supported source API from `packages/reader/src/lib.ts`; built-package documentation and package-verifier updates remain Ticket 05.

## Acceptance Criteria

- [x] `createBigWigFile({ url })` is synchronous, request-free, validates its options and HTTP(S) URL, and returns a reusable `BigWigFile`.
- [x] The public record, resolution, read-option, file-option, and file-interface types exactly match the specification.
- [x] Omitted resolution and `{ mode: "unzoomed" }` return decoded source value records from all supported unzoomed section types.
- [x] Auto mode validates positive finite `basesPerPixel` and chooses the largest declared reduction level not exceeding it, falling back to unzoomed only when none qualifies.
- [x] Level mode validates a positive integer and reads exactly that declared reduction level, rejecting unavailable values without substitution.
- [x] `getZoomLevels({ signal })` returns all declared reduction levels in ascending order without exposing internal offsets or headers.
- [x] Zoom reads return complete summary records, including all stored statistics and derived `mean`; unzoomed and zoom records remain distinguishable by `kind`.
- [x] Reads enforce established region validation, chromosome resolution, half-open overlap, source-coordinate preservation, sparse `[]`, stable sorting, and duplicate preservation; emitted records use the exact queried chromosome name without aliasing or reverse mapping.
- [x] Reading a BigBed or unsupported container rejects lazily with a clear ordinary format error.
- [x] Signals cover metadata, ranges, decompression, and decoding without cross-call cancellation or error translation.
- [x] Successfully loaded common headers, zoom headers, chromosome results, and R-tree headers per selected index are reused within one file object.
- [x] Failed and aborted metadata loads are retryable; concurrent misses may duplicate work but cannot share signal ownership; separate file objects share no cache.
- [x] Index nodes, blocks, decoded records, and regional results are fetched/decoded again for each read.
- [x] Fixture-backed reads cover compressed and uncompressed data and agree with committed source/inspection expectations.
- [x] Existing BigBed and shared BBI behavior remains passing after BigWig integration.

## Verification

Use focused selection-policy tests plus mocked exact-range and fixture-backed reads. Cover no levels, boundary equality, between-level selection, targets finer and coarser than all levels, unavailable explicit levels, unknown chromosomes, no-data regions, query boundaries, multiple blocks, wrong format, retries, abort timing, and concurrent reads. Assert request ranges sufficiently to distinguish cached immutable metadata from uncached query data.

## Starting Points

- `packages/reader/src/bigBed.ts` is the closest factory/orchestration and per-file cache precedent.
- `packages/reader/src/genomicFile.ts` owns the structural common contracts.
- `packages/reader/src/lib.ts` owns package-root source exports.
- `packages/reader/src/internal/inputValidation.ts` contains current URL and BigBed-named region validation; prefer one format-neutral regional validator rather than duplicating identical rules.
- `packages/reader/src/internal/abort.ts` defines established cancellation checks.
- `packages/reader/test/bigBed.test.ts` demonstrates range mocking, metadata-cache, retry, cancellation, and wrong-format coverage.

## Constraints

- Keep resolution query-specific and default omitted resolution to unzoomed.
- Auto mode is not a hard record cap and must not add post-read pixel aggregation.
- Keep BBI structures and resolution implementation details private.
- Preserve browser-native ESM constraints: no React, core, Axios, Node `Buffer`, filesystem, streams, or Node zlib.
- Do not introduce compatibility aliases or exports for the external reader package.

## Out of Scope

- Core BigWig/CAVE/MethylC migration or fetch-context changes.
- Renderer adaptation for summary extrema.
- BigBed zoom support, total-summary APIs, extra indexes, or AutoSQL.
- Global caching, block/result caching, prefetching, or parallel request optimization.
