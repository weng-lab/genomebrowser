# Ticket 02: Bind module settings to a track

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R6, R7, R8
**Blocked by:** Ticket 01

## Outcome

Every module settings component receives the current complete track and a typed `updateTrack` callback bound to that track's ID and protected by the browser interaction gate.

## Scope

Define and export the generic settings props and component types, carry them through `TrackModule` and `defineTrackModule`, and update the settings controller to pass the current track and bound updater. Existing settings components may continue to ignore the new props until Ticket 03.

## Acceptance Criteria

- [x] `TrackSettingsProps` exposes a shallow, read-only complete track and the typed updater.
- [x] `TrackSettingsComponent` carries the module config and interaction item types.
- [x] `TrackModule` and `defineTrackModule` reject settings components with incompatible props.
- [x] The controller passes the current track and binds updates to its ID.
- [x] The bound updater returns `TrackMutationResult` and rejects changes while the interaction gate is blocked.
- [x] The controller stops rendering module settings when the selected track no longer exists.
- [x] Focused controller and type-contract tests and the core typecheck pass.

## Verification

Use type-contract tests for module inference and prop compatibility. Use controller tests to inspect supplied props, update the intended track, exercise the interaction gate, and remove the active track.

## Starting Points

- `packages/core/src/modules/types.ts`
- `packages/core/src/modules/defineTrackModule.ts`
- `packages/core/src/browser/overlays/SettingsModalController.tsx`
- `packages/core/src/browser/state/browserContextState.ts`
- `packages/core/test/settingsModalController.test.tsx`
- `packages/core/test/typeContracts.test.ts`
- `packages/core/test/defineTrackModule.test.ts`

## Constraints

Read-only is a TypeScript contract. Do not clone, freeze, or make nested values deeply read-only. Base settings remain controller-owned and separate.

## Out of Scope

Rewriting module settings internals, changing base settings, documentation, and row layout.
