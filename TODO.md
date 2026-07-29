# Release Candidate TODO

## Repository

- [ ] Add required CI for install, lint, format, tests, build, app typecheck, and packed-artifact smoke tests.
- [ ] Add packed-tarball consumer tests that verify package imports, declarations, rendering, and CLI execution outside the workspace.
- [ ] Define compatible prerelease versions and decide whether core and UI release in lockstep.
- [ ] Replace stale alpha-version references and reconcile shipped documentation with the RC packages.
- [ ] Reconcile the repository package map and contributor documentation with the current workspace.
- [ ] Document a repeatable manual RC smoke pass for browser interactions and TrackSelect.
- [ ] Remove the obsolete package TODO files after their remaining valid work is represented here.

## Core

- [ ] Reject non-finite or non-positive viewport dimensions and zoom factors.
- [ ] Enforce non-negative genomic coordinates at parsing and committed-region boundaries.
- [ ] Document that chromosome upper bounds are unknown to the runtime for the RC.
- [ ] Isolate each track renderer with an error boundary so one failure cannot unmount sibling tracks or the browser.
- [ ] Isolate tooltip content with a separate error boundary in the global overlay.
- [ ] Freeze and document the supported root exports and first-party track modules.
- [ ] Fix and verify package export and declaration paths against the built tarball.

## UI

- [ ] Freeze and document the supported root and CLI exports.
- [ ] Fix and verify package export and declaration paths against the built tarball.
- [ ] Verify the packed CLI can show help and generate a schema outside the workspace.
- [ ] Record the manually verified TrackSelect interactions in the RC smoke pass.

## App

- [ ] Use the app as a typechecked integration consumer in CI.
- [ ] Decide whether the app must build in CI or only pass typechecking for the RC.

## Out of Scope for RC

- Chromosome-length injection and chromosome upper-bound clamping.
- Retry and reset UX for failed renderers or tooltips.
- Fetch cancellation, caching, and data-fetching architecture changes.
- Track rendering primitives and generalized adapter APIs.
- New highlights, settings, track tooltip, onboarding, or standalone-app features.
- Expanded TrackSelect automation beyond critical regressions and the manual smoke pass.
- Storybook, visual regression infrastructure, and nonessential testing-framework changes.
- Full accessibility, responsive-polish, and legacy-parity initiatives.
