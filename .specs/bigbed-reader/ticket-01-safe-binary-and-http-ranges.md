# Ticket 01: Safe binary and HTTP ranges

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R1, R2, R8, R13, R15, R16, R17, R18, R25, R26, R31
**Blocked by:** None

## Outcome

The reader package has private, browser-native primitives that validate BigBed inputs, fetch exact remote byte spans, preserve cancellation, and decode endian-aware unsigned binary values without losing 64-bit offsets.

## Scope

Implement the private foundation needed by later BBI tickets: synchronous HTTP(S) URL validation, BigBed region validation, exact `fetch` range access, query-scoped cancellation checkpoints, and a bounds-safe binary reader over `Uint8Array`/`DataView`. Keep these modules private and independent of BBI tree or BigBed record concepts.

## Acceptance Criteria

- [ ] HTTP(S) URLs are accepted synchronously without network work; invalid URLs and unsupported schemes throw synchronously.
- [ ] Invalid region coordinate types and values reject according to R13, while validation performs no fetch.
- [ ] Exact byte reads send an inclusive `Range` header and require an exact `206` response, no transport `Content-Encoding`, and the requested body length. An accessible `Content-Range` must match; an inaccessible one is tolerated for browser compatibility.
- [ ] Ignored ranges, transformed responses, mismatched ranges, and short or oversized bodies reject with ordinary errors.
- [ ] Native abort behavior is preserved, concurrent signals remain independent, and cancellation can be checked around sequential asynchronous and CPU work.
- [ ] The binary reader supports both byte orders, bounds-checks local reads, decodes unsigned 8/16/32-bit values, and retains unsigned 64-bit values as `bigint`.
- [ ] Unsafe conversion of a `bigint` offset or span to a JavaScript number rejects rather than losing precision.
- [ ] No new primitive is exported from the package root.

## Verification

Use deterministic mocked `fetch` responses to cover exact ranges, CORS-visible headers, status and header failures, transport encoding, body sizes, network errors, and cancellation. Use focused binary fixtures for both byte orders, unsigned values, 64-bit limits, cursor movement, and truncated buffers. Verify the package remains browser-compatible and does not introduce prohibited APIs.

## Starting Points

- `packages/reader/src/genomicFile.ts`
- `packages/reader/src/lib.ts`
- `packages/reader/test/lib.test.ts`
- `.specs/bigbed-reader/spec.md`
- The deleted old reader files are historical only; do not restore their public byte-source or package-error abstractions.

## Constraints

- Use browser `fetch`, `AbortSignal`, `Uint8Array`, and `DataView` only.
- Keep offsets as `bigint` until a checked local number conversion is required.
- Do not introduce a public byte source, custom error hierarchy, retry policy, buffering, caching, or request coalescing.

## Out of Scope

BBI headers, chromosome trees, regional indexes, block decompression, BigBed record decoding, Zod schemas, package exports, and user documentation.
