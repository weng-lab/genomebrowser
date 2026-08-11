# Ticket 02: Strict HTTP range reads

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R3, R4, R14, R15, R16, R18
**Blocked by:** None

## Outcome

Internal reader code can request an exact remote byte interval through browser `fetch`, reject unsafe or inconsistent responses, and be tested without a live server.

## Scope

Implement the internal random-access HTTP seam used by BigBed operations and an in-memory equivalent for tests. Define byte intervals unambiguously, emit the correct inclusive HTTP `Range` header, and validate the returned partial response before handing bytes to binary parsers.

## Acceptance Criteria

- [x] A request for an offset and length emits `Range: bytes=<start>-<inclusive-end>` and forwards the read's `AbortSignal`.
- [x] Only `206 Partial Content` is accepted for a successful byte read.
- [x] `Content-Range`, requested start/end, and body length are checked for consistency; missing, malformed, shifted, short, or extra data fails.
- [x] A range-ignoring `200` response fails before the complete response body is intentionally buffered.
- [x] Invalid offsets, lengths, overflowed range ends, HTTP failures, and unsatisfiable ranges produce useful failures.
- [x] The in-memory implementation follows the same exact-range contract and enables binary tests without mocking globals.
- [x] The implementation uses browser APIs and introduces no Axios, Buffer, Node stream, or filesystem dependency.

## Verification

Control `fetch` responses to verify request headers, valid `206` behavior, malformed `Content-Range`, `200`, `416`, short and oversized bodies, cancellation, and network rejection. Test in-memory reads at start, middle, end, and beyond the supplied bytes.

## Starting Points

- Existing weak behavior: `/home/jair/Dev/bigwig-reader/src/loader/AxiosDataLoader.ts` sends ranges but does not validate `206` or response consistency.
- Go reference: `/home/jair/Dev/gb-api/track/bigdata/requestbytes.go` detects short bodies but incorrectly permits range-ignoring `200` responses.

## Constraints

- Keep the byte source internal; this ticket does not establish a public DI or custom-source API.
- Remote resources are public, CORS-enabled HTTP(S) resources for this release.

## Out of Scope

- Authentication, custom headers, retries, complete-file fallback, caching, prefetching, and concurrency tuning.
