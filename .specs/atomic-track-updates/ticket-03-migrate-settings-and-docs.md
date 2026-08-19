# Ticket 03: Migrate module settings and documentation

**Status:** Ready
**Spec:** `./spec.md`
**Requirements:** R9, R10, R11
**Blocked by:** Ticket 02

## Outcome

Core and UI module settings use their supplied track and updater instead of reading the track store, and package documentation teaches the completed public contract.

## Scope

Migrate every existing core and UI module settings component and its tests. Update affected user-facing package docs and maintainer validation docs to remove `updateInteraction` and explain atomic updates and settings props.

## Acceptance Criteria

- [ ] Core and UI module settings read track data from `TrackSettingsProps`.
- [ ] Core and UI module settings submit live edits through the supplied `updateTrack` callback.
- [ ] Module settings no longer use the track store, track-store API, or settings store to discover the active track.
- [ ] Settings tests supply explicit props and verify the expected update patches and returned failures where relevant.
- [ ] Public docs describe shallow base, config, and interaction updates through `updateTrack`.
- [ ] Public docs show the typed module settings contract using public exports.
- [ ] A repository search finds no remaining `updateInteraction` API references outside historical specification text.
- [ ] Relevant core and UI tests, typechecks, lint, and documentation checks pass.

## Verification

Run focused settings tests for both packages, package typechecks, and package lint. Check public exports and examples against the implemented types. Search for direct track-store access in module settings and for stale `updateInteraction` references.

## Starting Points

- `packages/core/src/tracks/*/settings.tsx`
- `packages/ui/src/tracks/*/settings.tsx`
- Settings tests under `packages/core/test` and `packages/ui/test`
- `packages/core/docs/recipes.md`
- `packages/core/docs/customTrackModules.md`
- `packages/core/docs/validation.md`
- `packages/core/docs/troubleshooting.md`
- `docs/core/validation.md`
- Public exports in `packages/core/src/lib.ts`

## Constraints

Keep settings live. Do not add local transaction state, Apply or Cancel behavior, compatibility aliases, or direct access to an assumed global track store. Use `YOUR_URL_HERE` for any new example URL.

## Out of Scope

Base settings, row-layout controls, the first-party tracks package, and unrelated settings redesign.
