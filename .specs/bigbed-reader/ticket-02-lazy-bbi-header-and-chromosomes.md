# Ticket 02: Lazy BBI header and chromosome lookup

**Status:** Ready
**Spec:** `./spec.md`
**Requirements:** R14, R18, R19, R20, R22, R25, R31, R32
**Blocked by:** Ticket 01

## Outcome

A stateless private BBI layer can parse the common BigBed header and lazily resolve one chromosome name through the chromosome B+ tree without loading unrelated branches or assuming tree bytes are adjacent to the header.

## Scope

Parse the 64-byte common BBI header, validate BigBed magic, propagate detected endianness, and implement key-directed lookup through fixed-width chromosome B+ tree nodes using absolute file offsets. Return the chromosome ID and size needed by regional traversal while keeping all BBI structures private.

## Acceptance Criteria

- [ ] Common-header parsing detects BigBed magic in both byte orders and retains required offsets and compression metadata with correct unsigned types.
- [ ] Invalid magic and required truncated structures reject with ordinary errors.
- [ ] Chromosome lookup uses absolute child offsets and does not calculate them relative to an unrelated response buffer.
- [ ] Fixed-width padded keys route correctly through internal and leaf nodes, including multi-level trees.
- [ ] Lookup fetches only the branch needed for the requested chromosome and returns no match for an unknown chromosome.
- [ ] Separate reads do not retain header or tree state.
- [ ] BBI header and tree types remain private.

## Verification

Use focused synthetic node bytes to cover both byte orders, padded keys, internal and leaf nodes, multiple levels, missing chromosomes, and nodes stored outside the initial header range. Assert requested absolute ranges and prove unrelated branches are not fetched.

## Starting Points

- Ticket 01 range and binary primitives
- `packages/reader/test/fixtures/bigbed/basic.bb`
- Repository patch `patches/genomic-reader@1.4.10.patch` documents the old absolute-offset failure but is not an implementation source.
- Use an authoritative BBI format reference for wire layouts and constants; `~/Dev/gb-api/track/bigdata` is organizational reference only and must not be copied.

## Constraints

- Do not eagerly flatten the chromosome tree.
- Do not fetch AutoSQL, zoom data, total summaries, or extra indexes.
- Treat files as trusted while retaining local bounds and offset safety.

## Out of Scope

Regional R-tree traversal, data blocks, decompression, record decoding, public APIs, and caching.
