# Ticket 01: Unify track mutations

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R1, R2, R3, R4, R5
**Blocked by:** None

## Outcome

`updateTrack` can change base, config, and interaction fields in one validated store update. The separate `updateInteraction` method no longer exists.

## Scope

Extend the public update types and track store implementation to include interaction patches. Remove `updateInteraction` and update the focused store and type-contract tests.

## Acceptance Criteria

- [x] `TrackUpdate` accepts typed shallow patches for base, config, and interaction.
- [x] One `updateTrack` call can change all three mutable track parts, validates the complete candidate once, and notifies subscribers once.
- [x] Failed validation returns an error without changing any part of the stored track.
- [x] Untyped attempts to change `type` or `base.id` do not change track identity.
- [x] `updateInteraction` is removed from the public store and implementation without an alias.
- [x] Focused core tests and the core typecheck pass.

## Verification

Run the focused track-store and type-contract tests, then the core package typecheck. Cover a combined update, validation failure, identity protection, and removal of the old method.

## Starting Points

- `packages/core/src/modules/types.ts`
- `packages/core/src/browser/state/trackStore.ts`
- `packages/core/src/lib.ts`
- `packages/core/test/stores/trackStore.test.ts`
- `packages/core/test/typeContracts.test.ts`

`updateTrack` already provides the required base and config behavior. Extend that path rather than replacing it with a second mutation mechanism.

## Constraints

Updates remain shallow. The registered module remains the runtime validation authority. Preserve immutable `type` and `base.id` even for untyped callers.

## Out of Scope

Settings component props, settings migrations, documentation, and row layout.
