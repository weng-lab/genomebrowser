# Ticket 05: BigBed block and record decoding

**Status:** Ready
**Spec:** `./spec.md`
**Requirements:** R5, R9, R11, R12, R15, R16, R17, R18
**Blocked by:** Ticket 01, Ticket 02

## Outcome

Exact BigBed data-block ranges can be fetched, optionally decompressed, decoded into raw records, and filtered with the package's half-open regional semantics without returning partial results.

## Scope

Add a browser-compatible zlib decompression boundary and decode BigBed block records using the file's byte order. Interpret chromosome ID, start, end, and the NUL-terminated tab-delimited remainder; preserve positional and empty trailing fields as `rest: string[]`.

## Acceptance Criteria

- [ ] Blocks are fetched through exact byte-range reads and are decompressed when the header declares compressed data.
- [ ] Uncompressed blocks bypass decompression and use the same record decoder.
- [ ] Record chromosome IDs and coordinates honor the detected file byte order.
- [ ] No additional columns produce `rest: []`; additional columns preserve source order and empty positional values.
- [ ] Only records satisfying `record.start < region.end && record.end > region.start` are returned.
- [ ] Records for other chromosome IDs are excluded.
- [ ] Truncated coordinates, missing NUL terminators, malformed compressed data, and impossible records fail the complete operation rather than returning decoded prefixes.
- [ ] The decompression implementation is browser-safe and remains internal to the package.

## Verification

Use synthetic compressed and uncompressed blocks in both endian orders. Cover exact boundary overlaps, records spanning the query, records wholly outside it, multiple chromosome IDs, no rest fields, empty rest fields, trailing separators, malformed zlib data, and truncation after valid records.

## Starting Points

- Record layout reference: `decodeBedData` in `/home/jair/Dev/bigwig-reader/src/bigwig/BigWigReader.ts`; correct its implicit little-endian decoding and inclusive boundary behavior.
- Go reference: `/home/jair/Dev/gb-api/track/bigdata/bigbed/decoder.go`; do not copy its behavior of returning partial records after a decode error.
- Existing JavaScript uses `pako.inflate`; dependency selection remains an implementation choice as long as the shipped runtime remains browser-safe.

## Constraints

- Do not interpret standard BED fields, AutoSQL, or domain schemas in the raw decoder.
- Do not retain compressed or decoded blocks after the containing read completes.

## Out of Scope

- R-tree traversal, parser callbacks, public factories, built-in BED parsers, and block caching.
