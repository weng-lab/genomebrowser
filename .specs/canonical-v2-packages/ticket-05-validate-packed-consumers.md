# Ticket 05: Validate packed consumers

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R10, R11, R12
**Blocked by:** Ticket 04

## Outcome

The exact package tarballs intended for prerelease can be installed together in a clean, non-workspace consumer and demonstrably support runtime imports, UI imports, declarations, production bundling, and the UI CLI.

## Scope

Create or formalize a repeatable packed-artifact smoke-test seam outside workspace linking. Pack both packages, install those tarballs into clean consumer fixtures, exercise public imports and types, build a minimal production consumer, invoke the CLI and its subpath export, and correct packaging defects discovered by this validation.

## Acceptance Criteria

- [x] Verification packs both canonical packages and installs their tarballs without workspace linking or unpublished temporary package identities.
- [x] A clean consumer can import the runtime and UI package roots together and type-check against their emitted declarations.
- [x] A minimal production consumer build succeeds with the documented React and UI peer dependencies.
- [x] `@weng-lab/genomebrowser-ui/cli` resolves, and the installed `trackselect` executable responds successfully to its help invocation.
- [x] The UI resolves the packed runtime package rather than repository source aliases.
- [x] Tarball inspection confirms expected distribution files, declarations, shipped docs, schemas, executable files, and licenses are present, with source-only or secret material absent.
- [x] The validation is repeatable through a documented repository command or test procedure and cleans up or isolates generated artifacts.
- [x] Any public installation or CLI guidance corrected during validation is updated in the same ticket.
- [x] No npm publication or dist-tag mutation occurs.

## Verification

Run the packed-consumer procedure from clean temporary directories and then run the normal package checks to ensure packaging fixes do not regress workspace development. Capture the tarball versions, installation mode, type-check/build result, and CLI result in the implementation handoff.

## Starting Points

- `packages/core/package.json`, `packages/ui/package.json`
- UI `bin`, root export, `./cli` export, schema files, and Vite library output
- Existing package TODO material mentions packed external-consumer validation but must not be edited without separate authorization.
- Use temporary work outside the workspace for ephemeral consumers unless a small tracked fixture is clearly the more maintainable verification seam.

## Constraints

- Test tarballs, not workspace symlinks or direct source aliases.
- Use existing URLs or `"YOUR_URL_HERE"` in examples; do not invent track URLs.
- Do not run `pnpm run dev`, publish packages, or modify npm dist-tags.
- Keep fixes limited to packaging, declarations, documented installation, and validation infrastructure.

## Out of Scope

- Deployment of an application to a hosted environment.
- Migration support for legacy v1 consumers.
