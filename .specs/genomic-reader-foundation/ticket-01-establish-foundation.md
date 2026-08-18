# Ticket 01: Establish the genomic reader foundation

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14
**Blocked by:** None

## Outcome

`@weng-lab/genomic-reader` publishes a small, verified TypeScript contract for reading sparse coordinate-bearing records by genomic region, without committing the package to a concrete file format or internal reading strategy.

## Scope

Rename the reader package, implement and export the four foundation types, and prove the structural API with a private dummy implementation. Align package documentation and build output with the new public identity while preserving the package's browser-native boundary.

## Acceptance Criteria

- [x] The package is named `@weng-lab/genomic-reader`, and package metadata, build output, and package documentation consistently use that identity.
- [x] The package root exports only the `GenomicRegion`, `GenomicRecord`, `ReadOptions`, and generic `GenomicFile<T>` foundation types.
- [x] `GenomicFile<T>` requires coordinate-bearing records and exposes `read(region, options?)` returning `Promise<T[]>` with an optional native `signal`.
- [x] Compile-time coverage proves format-specific flat record fields remain available through `GenomicFile<T>` without assertions.
- [x] A test-private dummy factory demonstrates overlap filtering, coordinate sorting, unchanged records, unknown/empty results, and independent signals for concurrent reads.
- [x] The dummy factory and all test helpers remain absent from package-root exports.
- [x] The built package is browser-compatible ESM and emits declarations and sourcemaps without React, core, Axios, Buffer, filesystem, or Node-stream dependencies.

## Verification

Use focused type and runtime tests around the private dummy file. Verify package-scoped tests, typechecking, linting, formatting, and the library build. Inspect the emitted declarations and package-root surface to confirm only the intended foundation contract ships.

## Starting Points

- Package scaffold: `packages/reader/package.json`, `packages/reader/vite.config.ts`, and `packages/reader/tsconfig.json`.
- Public entry point: `packages/reader/src/lib.ts` does not yet exist.
- Package documentation: `packages/reader/README.md`.
- User cleanup has removed the previous BigBed implementation; do not restore or adapt it.

## Constraints

- Keep the API structural and type-oriented; do not add a base class, registry, or generic runtime factory.
- The package may define region and record types locally rather than depending on core.
- Treat records as trusted data and avoid runtime validation or a package-specific error hierarchy.
- Use only browser-native platform types in the public contract.

## Out of Scope

- Concrete genomic file factories or implementations.
- BBI, BigBed, BigWig, BigGenePred, GTF, GFF, Tabix, byte ranges, binary parsing, decompression, and index traversal.
- Caching, track-module lifecycle changes, custom sources, authentication, and request customization.
