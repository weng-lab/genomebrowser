# Ticket 06: Cache file metadata

**Status:** Reviewed
**Spec:** `./spec.md`
**Requirements:** A004 (supersedes R14)
**Blocked by:** None

## Outcome

Each BigBed file object lazily caches its successfully loaded header and chromosome lookup results, reducing repeated metadata range requests while preserving synchronous creation, retryability, and per-read cancellation isolation.

## Scope

Add private lifetime-scoped metadata state to the object returned by `createBigBedFile()`. Reuse the common BBI header across reads and cache chromosome lookup results by queried name, including unknown chromosomes. Keep regional-index traversal, data blocks, decoded records, and complete query results read-scoped and uncached. Update focused tests and the reader's public behavior documentation where it describes repeated reads.

## Acceptance Criteria

- [ ] `createBigBedFile()` remains synchronous and performs no network request.
- [ ] The first successful read loads and caches the common BBI header; later reads on the same file object do not request it again.
- [ ] Successful and unknown chromosome lookup results are cached by queried chromosome name and reused by later reads on the same file object.
- [ ] Reads for different chromosome names reuse the header while independently loading and caching each chromosome result.
- [ ] Separate file objects do not share cached state; creating a new object refreshes metadata from the URL on its first read.
- [ ] Regional-index nodes, data blocks, decoded records, and complete regional results remain uncached and are loaded or computed for each read.
- [ ] Failed or aborted header and chromosome loads do not populate their cache entry, and a later read can retry successfully.
- [ ] Concurrent cache misses retain independent cancellation behavior. One read's signal must not cancel or determine another read's metadata load; duplicate initial metadata requests are acceptable.
- [ ] A read that uses cached metadata still checks its own cancellation before beginning read-owned index and block work.
- [ ] The cache and all BBI metadata types remain private; the public factory and `GenomicFile` contracts do not change.

## Verification

Use deterministic mocked range responses and requested-range assertions. Cover first versus repeated same-chromosome reads, different and unknown chromosomes, separate file objects, transient failures, pre-aborted and mid-load cancellation, and concurrent reads with independent signals. Assert that repeated reads omit cached header/chromosome ranges but still repeat regional-index and data-block ranges. Run the reader package's normal verification and use the reader benchmark as a non-gating before/after observation; no timing threshold is required.

## Starting Points

- `packages/reader/src/bigBed.ts`: `createBigBedFile()` and `readBigBed()` currently retain only URL/schema configuration and load metadata during every read.
- `packages/reader/src/internal/bbi/commonHeader.ts`: `readBbiHeader()` returns the immutable header value to cache.
- `packages/reader/src/internal/bbi/chromosomeTree.ts`: `lookupChromosome()` returns `Chromosome | undefined`; the cache must distinguish an absent entry from a cached unknown chromosome.
- `packages/reader/test/bigBed.test.ts`: existing repeated-read and cancellation coverage currently asserts stateless behavior and must be replaced, not layered with contradictory expectations.
- `benchmarks/reader/compare.mjs`: real-data benchmark for Astro peaks and ENCODE cCREs.

## Constraints

- Do not make factory creation asynchronous or eager.
- Cache only successfully resolved immutable metadata. Do not cache rejected promises or signal-bound in-flight work.
- Prefer duplicate concurrent cache-miss requests over coupling callers through shared cancellation.
- Treat a file object's URL as immutable for its lifetime; callers create a new object to observe changed remote metadata.
- Preserve exact HTTP range validation and ordinary native failure propagation.

## Out of Scope

Regional-index, data-block, decoded-record, or complete-result caching; global or cross-object caches; shared in-flight request coalescing; cache invalidation or expiration; retries inside a single read; read-ahead, range merging, or parallel traversal; public cache controls; and timing-based acceptance gates.
