# Ticket 07: Package and browser contract

**Status:** Ready
**Spec:** `./spec.md`
**Requirements:** R1, R14, R16, R19
**Blocked by:** Ticket 06

## Outcome

The completed reader builds and packs as a documented browser-safe ESM library with correct declarations, sourcemaps, exports, and no accidental Node or legacy-reader coupling.

## Scope

Finish package build scripts and metadata now that a source entry exists, verify emitted artifacts, and document the supported BigBed API and runtime requirements. Audit the dependency graph and bundle for prohibited compatibility code.

## Acceptance Criteria

- [ ] Package scripts build the ESM library and declarations through the scaffolded Vite configuration and participate safely in root recursive verification.
- [ ] Package metadata points to emitted files that exist, and prepack cannot publish stale or missing output.
- [ ] The package can be packed and imported through its declared root export.
- [ ] Emitted declarations preserve raw and `parseRest`-inferred result types.
- [ ] Built output includes sourcemaps and has no Node built-ins, Buffer shim, Axios, `genomic-reader@1.x`, or undeclared runtime dependency.
- [ ] Browser-oriented package documentation shows the minimal create-and-read flow using `YOUR_URL_HERE`, describes zero-based half-open regions and `rest`, and states the `206`/CORS requirements and initial exclusions.
- [ ] The package remains private unless publication is separately approved; verification must not publish it.

## Verification

Run package formatting, linting, type checking, tests, build, and a package dry run or artifact inspection that does not publish. Inspect generated JavaScript, declarations, package contents, and dependency metadata. Confirm documentation examples use only package-root exports.

## Starting Points

- Scaffold: `packages/reader/package.json`, `vite.config.ts`, `tsconfig.json`, and `README.md`.
- Follow the reusable library conventions in `packages/core` only where they apply; do not copy React, proxy, Buffer, Axios, or CSS configuration.

## Constraints

- Public behavior documentation belongs with `packages/reader` and must be self-contained when shipped.
- Publication and migration of existing consumers require separate approval.

## Out of Scope

- Publishing, core migration, compatibility aliases, additional formats, caching, and performance optimization.
