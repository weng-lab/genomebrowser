# Slice 4: Cleanup Helpers, Types, And Tests Around The New Model

## Dependencies

Slice 3: Remove Internal Persistence And Initialize From TrackStore.

## Description

Trim the old store-specific API surface, simplify helper responsibilities around managed tracks, and update tests to reflect the new draft-then-submit flow. This should leave the codebase aligned with the simplified architecture rather than carrying compatibility leftovers.

## Expected Behaviors Addressed

- The old local selection store abstraction is gone.
- Helper code is focused on draft-to-track conversion and managed-track replacement.
- Tests validate draft initialization, no pre-submit browser mutation, submit behavior, cancel behavior, unmanaged-track preservation, and selection-order insertion.
- The final code reads as one coherent model instead of a partial migration.

## Acceptance Criteria

- [ ] Old store-specific files, types, and APIs are removed or reduced to only what still serves the new model.
- [ ] Managed-track helper code reflects the draft-then-submit architecture without stale reconciliation or persistence assumptions.
- [ ] Tests cover the new behavior model and no longer rely on the removed local store lifecycle.
- [ ] The resulting `TrackSelect` implementation is simpler to read with fewer redundant concepts.

## QA

1. Review the final `TrackSelect` implementation and confirm there is no leftover local zustand selection-store abstraction.
2. Run the `packages/ui` test suite and confirm the updated behavior is covered.
3. Verify the local UI harness still supports open, edit, cancel, and submit flows cleanly.
4. Review helper/type files and confirm they match the new architecture rather than preserving compatibility layers.

---

_Appended after execution._

## Completion

**Built:** Removed the leftover local selection-store surface from `packages/ui`, collapsed managed-track helper logic around a single draft model derived from committed `trackStore` state, and rewrote the `packages/ui` tests to cover draft initialization, local-only edits before submit, submit replacement behavior, unmanaged-track preservation, selection order, and decoration.

**Decisions:** Kept the public cleanup focused on code that was clearly stale in the new model: the old `store.ts`, selection-store types, and `lib.ts` exports are gone, while `TrackSelect` now uses one helper path to derive draft state from committed tracks and one helper path to rebuild managed tracks on submit. Left `buildManagedTracks(...)` in place because the local UI harness still uses it to preseed committed managed tracks before opening the modal.

**Deviations:** I did not manually drive the local UI harness because repo guidance says not to start the dev server here. I verified the harness path statically via the existing `packages/ui/test/main.tsx` seeding code and covered the slice behavior with the `packages/ui` Vitest suite plus a successful `packages/ui` production build.

**Files:** Modified `.plans/simplify-trackselect-draft-state/completed/04-cleanup-helpers-types-and-tests-around-the-new-model.md`, `packages/ui/src/TrackSelect/TrackSelect.tsx`, `packages/ui/src/TrackSelect/managedTracks.ts`, `packages/ui/src/TrackSelect/types.ts`, `packages/ui/src/lib.ts`, and `packages/ui/test/startup.test.ts`. Deleted `packages/ui/src/TrackSelect/store.ts`.

**Notes for next slice:** This plan is now fully executed. `TrackSelect` owns only modal draft state, `trackStore` remains the committed source of truth, and the remaining helper/test surface in `packages/ui` is aligned with that model instead of preserving the old local store lifecycle.
