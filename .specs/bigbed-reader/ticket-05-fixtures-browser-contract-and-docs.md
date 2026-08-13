# Ticket 05: Fixtures, browser contract, and docs

**Status:** Ready
**Spec:** `./spec.md`
**Requirements:** R2, R11, R11a, R12, R14, R15, R16, R17, R19, R22, R24, R26, R29, R30
**Blocked by:** Ticket 04

## Outcome

The complete BigBed reader is verified against reproducible compressed and uncompressed files, its browser/package boundaries are enforced, and consumers have self-contained documentation for the public API and failure behavior.

## Scope

Add the uncompressed converter-generated fixture and regeneration instructions, complete end-to-end and browser-contract coverage, and update the reader README and package docs for `createBigBedFile` and `bed3Schema`.

## Acceptance Criteria

- [ ] A small `bedToBigBed -unc` fixture is committed with its source BED, chromosome sizes, and exact regeneration command.
- [ ] Compressed and uncompressed fixtures produce equivalent observable regional results where their source records match.
- [ ] End-to-end coverage includes boundaries, multiple chromosomes, unknown chromosomes, no-data regions, stable duplicate handling, cancellation, and stateless repeated reads.
- [ ] Focused coverage proves chromosome-spanning index/block filtering even if the converter fixtures do not naturally produce it.
- [ ] Browser-contract tests cover strict `206`, exposed `Content-Range`, rejected `200`, transformed responses, and exact body ranges.
- [ ] Build output remains browser ESM with declarations and sourcemaps and contains no prohibited runtime dependencies or public internals.
- [ ] The package README and self-contained package docs explain installation/dependencies, factory options, inferred records, `fields`, regional reads, cancellation, valid no-data `[]`, and failure behavior using public imports and `YOUR_URL_HERE`.
- [ ] Fixture output is compared with its BED source or an independent UCSC tool result.
- [ ] Explain zod fields schema effectively in docs.

## Verification

Run the package's tests, typecheck, lint, formatting check, and build. Inspect package exports and built artifacts. Verify documentation examples against the public types and ensure all examples use supported public HTTP(S) URL placeholders.

## Starting Points

- `packages/reader/test/fixtures/bigbed/README.md`
- `packages/reader/test/fixtures/bigbed/basic.bb`
- `packages/reader/README.md`
- `packages/reader/docs/`
- `packages/reader/package.json`

## Constraints

- Package docs must be self-contained and must not link readers to repository-only specifications.
- Keep full external BigBed files optional unless size and redistribution rights permit committing them.
- Do not use live public URLs for routine deterministic tests.

## Out of Scope

Performance optimization, whole-file compressed inputs, authenticated resources, core migration, and additional formats or schemas.
