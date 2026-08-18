# Ticket 05: Document and verify the BigWig API

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R1-R13, R21-R22, R29, R31
**Blocked by:** Ticket 04

## Outcome

The published reader package exposes and documents the complete supported BigWig API, distinguishes source values from zoom summaries, explains resolution behavior accurately, and passes built-artifact verification without exposing private BBI internals.

## Scope

Update the package README, add self-contained BigWig package documentation, and update package export verification for all new runtime and type declarations. Include realistic examples for unzoomed reads, zoom discovery, automatic viewport-based selection, exact reduction-level reads, cancellation, and record discrimination.

Build and inspect the distributable package to verify declarations, sourcemaps, ESM behavior, dependency policy, and root exports.

## Acceptance Criteria

- [x] `packages/reader/README.md` introduces `createBigWigFile` alongside BigBed without obscuring either API.
- [x] A self-contained `packages/reader/docs/bigwig.md` documents every public BigWig type and method needed by consumers.
- [x] Documentation states that omitted resolution is unzoomed and explains the scientific distinction between source value records and lossy zoom summaries.
- [x] Documentation identifies every stored zoom statistic and clearly labels `mean` as `sum / validCount` rather than an encoded field.
- [x] Auto examples calculate `basesPerPixel` from region span and viewport width and explain that this targets resolution rather than enforcing a hard result count.
- [x] Explicit-level examples use `getZoomLevels()` and explain exact-match rejection.
- [x] Cancellation, sparse `[]`, half-open overlap, original coordinates, supported HTTP(S) range servers, and ordinary failure behavior are documented.
- [x] Package verification expects the intended BigWig runtime export and emitted public declarations while rejecting accidental private BBI/decoder exports.
- [x] The built package remains browser-compatible ESM with declarations and sourcemaps and introduces no prohibited dependency.
- [x] All examples use `"YOUR_URL_HERE"` or existing repository URLs rather than invented track URLs.

## Verification

Run the reader package's build, typecheck, tests, and package-verification workflow. Inspect the generated declaration entry point and bundled runtime exports. Confirm documentation examples compile conceptually against package-root exports and do not import internal paths.

## Starting Points

- `packages/reader/README.md` and `packages/reader/docs/bigbed.md` establish package documentation organization and HTTP/failure language.
- `packages/reader/scripts/verify-package.mjs` currently hardcodes intended package-root exports.
- `packages/reader/src/lib.ts` is the source export boundary completed in Ticket 04.
- Follow the repository documentation guidance: package docs must be self-contained because they ship with the package.

## Constraints

- Do not document core integration before it exists.
- Do not expose or teach private BBI headers, offsets, indexes, or byte operations as supported API.
- Do not imply that zoom summaries are raw measurements or that auto mode guarantees one record per pixel.

## Out of Scope

- Core, UI, or app documentation changes.
- Migration guides for the external `genomic-reader` package.
- Performance claims or benchmark thresholds.
