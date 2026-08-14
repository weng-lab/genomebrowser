# Ticket 07: Cache primary R-tree header

**Status:** Reviewed
**Spec:** `./spec.md`
**Requirements:** A005
**Blocked by:** None

## Outcome

Repeated reads on one BigBed file object reuse the immutable primary R-tree header while continuing to fetch regional-index nodes and data blocks for every query.

## Scope

Extend the private per-file metadata cache with the parsed primary R-tree header and allow regional traversal to reuse it. Update focused requested-range tests and relevant package documentation.

## Acceptance Criteria

- [ ] The first read that reaches regional traversal loads and caches the primary R-tree header.
- [ ] Later reads on the same file object omit the primary R-tree header range but repeat root/node and data-block ranges.
- [ ] Failed or aborted R-tree header loads do not populate the cache and remain retryable.
- [ ] Concurrent cache misses do not share signal-bound in-flight work; duplicate loads are acceptable.
- [ ] Separate file objects do not share the cached R-tree header.
- [ ] Regional-index nodes, block references, data blocks, decoded records, and complete results remain uncached.
- [ ] The cache and parsed R-tree header type remain private and the public reader API does not change.

## Verification

Use deterministic range mocks to distinguish the 48-byte primary R-tree header request from root/node and block requests. Verify first and repeated reads, retry after failure or cancellation, separate object isolation, and that node/data ranges continue to repeat. Run directly affected reader tests and typecheck.

## Starting Points

- `packages/reader/src/bigBed.ts`: private per-file metadata cache and read orchestration.
- `packages/reader/src/internal/bbi/regionalIndex.ts`: primary R-tree header parsing and traversal currently occur together in `findPrimaryDataBlocks()`.
- `packages/reader/src/internal/bbi/dataBlocks.ts`: regional-index entry point.
- `packages/reader/test/bigBed.test.ts`: metadata cache and requested-range assertions.

## Constraints

- Do not cache R-tree nodes or introduce cache limits, expiration, request coalescing, read-ahead, or parallel traversal.
- Do not make factory creation eager or asynchronous.
- Do not cache failures or signal-bound promises.

## Out of Scope

Regional-index node caching, data-block caching, range merging, speculative reads, parallel requests, public cache controls, and timing-based acceptance thresholds.
