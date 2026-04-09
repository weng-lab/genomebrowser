# Slice 1: Remove Ordering State From TrackSelect

## Dependencies

None.

## Description

Simplify TrackSelect and the managed-track utilities by removing `selectedTrackIdsInOrder` and any ordering-based behavior, leaving only selected ID state per folder. Update the affected tests in the same slice so the simplified state model is covered immediately.

## Expected Behaviors Addressed

- Track selection order in the UI does not affect browser behavior.
- Reset and clear flows only work from selected IDs.
- Ordering-specific logic and tests are removed together.

## Acceptance Criteria

- [ ] `TrackSelect` no longer stores or updates selection ordering state.
- [ ] Managed-track helper APIs no longer require ordering inputs or produce ordering outputs.
- [ ] Reset, clear, and selection-change flows still behave correctly using only selected IDs.
- [ ] Ordering-oriented tests are removed or updated within this slice.

## QA

1. Open the TrackSelect modal with managed tracks already loaded.
2. Confirm the already loaded managed tracks show as selected.
3. Select and deselect tracks across folders, then use Clear and Reset.
4. Confirm the UI selection state updates correctly without any ordering-specific behavior.
5. Run the relevant `packages/ui` tests covering TrackSelect draft state and reset/clear behavior.

---

_Appended after execution._

## Completion

**Built:** Removed `selectedTrackIdsInOrder` from the TrackSelect draft state and managed-track helper APIs, so selection, clear, reset, and submit now operate only on `selectedByFolder`.

**Decisions:** Kept the refactor narrow by simplifying the existing helpers instead of adding new abstractions. `replaceManagedTracksInStore` now rebuilds managed tracks directly from folder selections, which keeps this slice focused on removing ordering state without changing the later diff-based submit plan.

**Deviations:** There was no existing component-test harness for the modal clear/reset flows in `packages/ui`, so automated coverage stayed in the helper-level tests plus a package build. Manual UI QA was not run in this session because the plan marks starting the dev server as out of scope.

**Files:** Modified `packages/ui/src/TrackSelect/TrackSelect.tsx`, `packages/ui/src/TrackSelect/managedTracks.ts`, `packages/ui/test/startup.test.ts`, and this slice file.

**Notes for next slice:** Submit still replaces the full managed subset in the store. The next slice can now focus only on diffing current managed IDs against the modal draft without needing to unwind any ordering state first.
