# Ticket 01: Safe binary parsing foundation

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R11, R12, R15, R16, R18
**Blocked by:** None

## Outcome

The reader package has a bounds-checked, endian-aware internal binary parsing foundation that can safely represent valid BigBed offsets and report malformed input without Node compatibility APIs.

## Scope

Implement the internal typed-array cursor and package-owned errors needed by later BigBed parsing. Support the integer, floating-point, fixed-string, and NUL-terminated string operations required by BigBed headers, trees, indexes, and records. Convert 64-bit file values to JavaScript numbers only after safe-integer validation.

## Acceptance Criteria

- [x] Binary reads operate on `Uint8Array`/`DataView` and explicitly honor little- and big-endian byte order.
- [x] Reads advance deterministically and fail with contextual package errors when data is truncated or a requested value is out of bounds.
- [x] Unsigned 64-bit offsets and sizes are accepted only when exactly representable as safe JavaScript integers.
- [x] Fixed-length, NUL-terminated, and remaining-string helpers cover the string layouts needed by BigBed.
- [x] Package errors preserve useful context and causes without translating a native abort into an unrelated format error.
- [x] The implementation imports no `Buffer`, `fs`, Node stream, or Axios APIs.

## Verification

Use focused unit tests for every primitive, both byte orders, cursor advancement, offset overflow, missing terminators, and truncated buffers. Include boundary values around `Number.MAX_SAFE_INTEGER`.

## Starting Points

- Algorithm reference: `/home/jair/Dev/bigwig-reader/src/util/BinaryParser.ts`; do not reproduce its unchecked `getLong()` conversion or implicit endian defaults.
- Algorithm reference: `/home/jair/Dev/gb-api/utils/parser.go`; use as behavior reference only because that repository has no discovered license.
- Reader source belongs under `packages/reader/src`; tests belong under `packages/reader/test`.

## Constraints

- Keep this internal; do not export the cursor or binary helpers from the package root.
- Prefer a small concrete parser over a general serialization framework.

## Out of Scope

- HTTP, BigBed headers, indexes, decompression, records, and public file factories.
