# Slice 2: Submit Applies Managed Tracks In Selection Order

## Dependencies

Slice 1: Local Draft State Without Store Writes.

## Description

Make `Submit` the single point where `TrackSelect` converts draft state into managed browser tracks and writes them into `trackStore`, preserving unmanaged tracks and applying managed tracks in first-selection order.

## Expected Behaviors Addressed

- Clicking `Submit` applies the draft into the browser `trackStore`.
- Unmanaged tracks already in `trackStore` remain visible and untouched.
- Managed tracks are inserted in the order they were selected.
- Folder-owned track creation continues to drive managed track creation.

## Acceptance Criteria

- [x] `Submit` is the only path that writes draft-managed changes into `trackStore`.
- [x] Managed tracks are rebuilt from the draft and inserted in first-selection order.
- [x] Unmanaged tracks in `trackStore` remain untouched when managed tracks are replaced.
- [x] Decoration hooks, if present, still apply before managed tracks are inserted.

## QA

1. Open the local UI test harness and make several draft selection changes across folders.
2. Confirm the browser does not change before submission.
3. Click `Submit` and confirm the browser updates to match the draft.
4. Select tracks in a known order and confirm the resulting managed tracks appear in that order.
5. Run the `packages/ui` test suite covering submit behavior, ordering, and unmanaged-track preservation.

---

_Appended after execution._

## Completion

**Built:** Added ordered draft-selection tracking in `TrackSelect` so the modal preserves first-selection order across folders and now passes that order into `replaceManagedTracksInStore(...)` when `Submit` commits managed tracks.

**Decisions:** Kept the draft UI state split between the existing per-folder selection map and a new ordered managed-ID list, then added focused helper logic in `managedTracks.ts` to derive committed order from `trackStore`, build fallback order from defaults, and rebuild managed tracks in explicit selection order while still preserving unmanaged tracks and decoration hooks.

**Deviations:** I did not run the manual local UI harness QA because repo guidance says not to start the dev server from here. I covered the slice with the `packages/ui` Vitest suite instead, including new ordering-focused business-logic tests.

**Files:** Modified `packages/ui/src/TrackSelect/TrackSelect.tsx`, `packages/ui/src/TrackSelect/managedTracks.ts`, `packages/ui/test/startup.test.ts`, and moved this slice file into `completed/`.

**Notes for next slice:** `TrackSelect` now has deterministic submit ordering via `selectedTrackIdsInOrder`, so the remaining simplification work can remove internal persistence and initialization fallbacks without changing submit semantics.
