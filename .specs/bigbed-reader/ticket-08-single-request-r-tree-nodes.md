# Ticket 08: Read R-tree nodes in one request

**Status:** Reviewed
**Spec:** `./spec.md`
**Requirements:** A006
**Blocked by:** None

## Outcome

When the remote resource size is available from a validated `Content-Range`, each traversed primary R-tree node is fetched in one exact read-ahead request rather than sequential header and body requests, while servers hiding that metadata retain the existing path.

## Scope

Retain an optional complete resource size in the private file metadata, expose it from existing exact range responses without an extra request, and use it with the cached R-tree block size to read and parse a complete maximum node span. Preserve the current two-request traversal as fallback.

## Acceptance Criteria

- [ ] A valid exposed numeric `Content-Range` complete length can be retained as private per-file metadata without changing the public API or adding a request.
- [ ] With known resource size, each R-tree node uses one exact range covering its maximum encoded span, capped at the resource boundary.
- [ ] Node parsing consumes only the declared node and ignores safe read-ahead bytes while retaining node type, count, block-size, binary-bound, and offset validation.
- [ ] Missing, inaccessible, or wildcard complete size uses the existing exact header-then-body requests.
- [ ] Strict `206`, `Content-Range`, body-length, and `Content-Encoding` checks remain unchanged for every requested range.
- [ ] Failed and aborted requests do not populate file metadata; concurrent request signals remain independent and separate file objects do not share size state.
- [ ] R-tree nodes remain uncached and are requested again on each read.
- [ ] Existing compressed/uncompressed decoding and regional results remain unchanged.

## Verification

Use deterministic range mocks to assert one request per traversed node when complete size is exposed, two requests when it is hidden or wildcard, and an exact cap for a node near the resource end. Cover malformed/truncated spans, oversized declared counts, retry/cancellation, repeated reads proving nodes are not cached, and unchanged end-to-end records. Run focused reader tests, typecheck, lint, formatting, and build.

## Starting Points

- `packages/reader/src/internal/httpRange.ts`: validates `Content-Range` but currently discards its complete length.
- `packages/reader/src/internal/bbi/regionalIndex.ts`: reads every node header and body sequentially.
- `packages/reader/src/bigBed.ts`: owns the per-file immutable metadata cache.
- `packages/reader/src/internal/bbi/commonHeader.ts` and `dataBlocks.ts`: metadata and traversal handoff.
- `packages/reader/test/httpRange.test.ts`, `bbi.test.ts`, and `bigBed.test.ts`.

## Constraints

- Do not cache R-tree nodes, merge unrelated ranges, parallelize traversal, or add speculative data-block reads.
- Do not require exposed `Content-Range` or weaken the no-header compatibility path.
- Keep browser-native `fetch`, exact range semantics, cancellation isolation, and private BBI types.

## Out of Scope

Node caching, data-block parallelism, range coalescing beyond one node, public byte sources or cache controls, retries, and timing-based acceptance thresholds.

## Amendments

### A001 - Bound read-ahead spans

- **Supersedes:** The outcome and acceptance criteria where they require one request for every known-size node without an optimization limit.
- **Replacement:** Apply single-request read-ahead only when the maximum encoded node span is at most the private 1 MiB ceiling. Larger spans use the existing exact header/body path without rejecting the file. Verification must cover the ceiling fallback.
