# Ticket 06: Public regional BigBed read

**Status:** Ready
**Spec:** `./spec.md`
**Requirements:** R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R17, R18, R19
**Blocked by:** Ticket 03, Ticket 04, Ticket 05

## Outcome

Consumers can create a BigBed file from a public URL and read raw or parser-typed records for a genomic region through the complete high-level API defined by the specification.

## Scope

Implement `createBigBedFile`, public types, region validation, read orchestration, parser application, and deliberate package-root exports. Connect the HTTP, header, chromosome, R-tree, block, decompression, and record components into one uncached read lifecycle.

## Acceptance Criteria

- [ ] `createBigBedFile({ url })` returns an object with `read(region, options?)` and performs no network work until `read` is called.
- [ ] Raw reads resolve to records shaped as `{ chromosome, start, end, rest: string[] }`.
- [ ] Supplying `parseRest` infers additional result fields without ordinary caller type assertions.
- [ ] Parser output is merged without permitting it to override reader-owned coordinates in types or at runtime.
- [ ] Parser exceptions reject the whole read and do not return partial results.
- [ ] Region validation rejects empty chromosome names, unsafe or negative coordinates, reversed bounds, and zero-width regions before regional data decoding.
- [ ] Unknown chromosomes return `[]` without traversing or reading the regional data index.
- [ ] `AbortSignal` reaches work owned by the read, stops subsequent dependent work, and never yields partial results.
- [ ] Two calls to `read` independently reload header and index metadata; duplicate data-block references within one call are fetched once.
- [ ] The package root exports only the supported factory, file/options/result/parser/read types, and package errors required by consumers.
- [ ] An end-to-end deterministic fixture proves a complete regional read through the public API.

## Verification

Add runtime and compile-time contract tests for raw reads, parser inference, coordinate authority, region validation, unknown chromosomes, cancellation, parser failure, repeated uncached reads, and the full successful lifecycle. Exercise the public package entry point rather than internal imports for contract coverage.

## Starting Points

- Public contract and lifecycle are authoritative in `spec.md`; do not reproduce the legacy `AxiosDataLoader`/`BigWigReader` API.
- Candidate behavior fixture: `/home/jair/Dev/bigwig-reader/resources/static/testbb.bigbed`. Confirm fixture provenance before copying it; otherwise generate and document a minimal fixture from known source data.
- Existing consumer behavior is in `packages/core/src/tracks/bigbed/fetch.ts`, but migration is explicitly outside this ticket.

## Constraints

- Keep the region shape structurally compatible with core without adding a reader-to-core dependency or shared types package.
- Keep internal DI and byte-reading seams out of package-root exports.
- Do not add cross-read metadata or global URL caching to make repeated-read tests pass faster.

## Out of Scope

- Core integration, a first-party tracks package, built-in parsers, authentication, AutoSQL, and additional formats.
