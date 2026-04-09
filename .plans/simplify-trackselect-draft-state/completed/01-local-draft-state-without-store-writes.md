# Slice 1: Local Draft State Without Store Writes

## Dependencies

None.

## Description

Replace the local selection store with plain React draft state inside `TrackSelect` and stop mutating `trackStore` while the modal is open. The modal should still open with the current managed selection, let the user edit it, and keep the browser unchanged until the user commits.

## Expected Behaviors Addressed

- Opening `TrackSelect` initializes the draft from the current committed managed tracks.
- While the modal is open, selecting and deselecting tracks only changes the draft UI state.
- The browser does not change while the user is still editing.
- Clicking `Cancel` closes the modal and discards all draft changes from that session.

## Acceptance Criteria

- [ ] `TrackSelect` no longer uses the local zustand selection store for managed selection state.
- [ ] Opening the modal derives the draft selection from the currently managed tracks already present in `trackStore`.
- [ ] Grid selection, tree removals, clear, and reset update only local draft state while the modal is open.
- [ ] Cancel closes the modal without mutating `trackStore`.

## QA

1. Open the local UI test harness with managed tracks already present in the browser.
2. Open `TrackSelect` and confirm the selected rows match the currently visible managed tracks.
3. Add and remove tracks in the modal and confirm the browser does not change while the modal remains open.
4. Click `Cancel` and confirm the modal closes and the browser remains unchanged.
5. Run the `packages/ui` test suite covering draft initialization and no pre-submit browser mutation.

---

_Appended after execution._

## Completion

**Built:** Replaced `TrackSelect`'s local zustand selection-store usage with plain React draft state, initialized that draft from the currently committed managed tracks in `trackStore` when the modal opens, and kept modal edits local until `Submit`.

**Decisions:** Added a focused `deriveManagedSelectionFromStore(...)` helper so draft initialization comes from the committed browser model and preserves current managed-track order. Kept `Submit` writing through `replaceManagedTracksInStore(...)` so the component still commits edits explicitly while `Cancel`, clear, reset, grid selection, and tree removals remain draft-only.

**Deviations:** Kept the old exported selection-store module in place for now instead of removing it in this slice, since the acceptance criteria only required `TrackSelect` to stop using it and broader cleanup can happen in a later slice without widening scope.

**Files:** Modified `packages/ui/src/TrackSelect/TrackSelect.tsx`, `packages/ui/src/TrackSelect/managedTracks.ts`, `packages/ui/test/startup.test.ts`, and this slice file.

**Notes for next slice:** `TrackSelect` now stages managed selections locally and only writes on `Submit`. The next slice can focus on submit ordering semantics and any helper cleanup without needing to unwind live store writes during editing.
