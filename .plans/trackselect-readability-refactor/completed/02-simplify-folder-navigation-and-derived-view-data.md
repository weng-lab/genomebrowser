# Slice 2: Simplify folder navigation and derived view data

## Dependencies

Slice 1: Extract draft selection and submit state flow

## Description

Reduce the amount of inline derived view logic in `TrackSelect` by centralizing active folder, selected IDs, selected count, rows, and tree data shaping behind a smaller interface. End-to-end, the user still navigates between folder list and folder detail, sees the correct available rows, and sees active tracks grouped correctly, but the top-level render path becomes much easier to scan.

## Expected Behaviors Addressed

- `TrackSelect` remains functionally the same from the user's perspective.
- Changing selections in the modal stays local until submit.
- Clear still clears the current folder or all folders depending on the current view.
- The top-level component reads top-to-bottom as layout plus event wiring, not as a mixed state machine.

## Acceptance Criteria

- [ ] `TrackSelect` no longer builds folder trees and most active-folder derived values inline.
- [ ] Folder list and folder detail navigation still behave the same.
- [ ] Tree view removal still updates the correct folder selection.

## QA

1. Open the modal with multiple folders.
2. Confirm the folder list is shown first.
3. Click a folder and confirm the detail grid for that folder appears.
4. Select rows in the grid and confirm the active tracks tree updates.
5. Remove an item from the active tracks tree and confirm the corresponding grid selection is removed.
6. Navigate back to the folder list and enter another folder.
7. Confirm draft selections from the first folder are still reflected correctly.

---

## Completion

**Built:** Extracted active-folder view shaping into `deriveTrackSelectViewData`, so `TrackSelect` now reads mostly as dialog wiring and layout while folder rows, counts, selected IDs, and active trees are derived in one place.

**Decisions:** Kept folder navigation and draft-selection transitions in `useTrackSelectState`; kept runtime config state in `TrackSelect` for the next slice, but routed its effect through the new pure view-data helper.

**Deviations:** Did not add a rendered integration test for folder navigation because this slice only moved pure derivation logic; instead added focused helper tests covering active-folder data, selected counts, tree building, and folder ID tagging.

**Files:** `packages/ui/src/TrackSelect/TrackSelect.tsx`, `packages/ui/src/TrackSelect/useTrackSelectState.ts`, `packages/ui/src/TrackSelect/trackSelectViewData.ts`, `packages/ui/test/trackSelectState.test.ts`, `.plans/trackselect-readability-refactor/completed/02-simplify-folder-navigation-and-derived-view-data.md`

**Notes for next slice:** Runtime config override state is still stored as a per-folder map in `TrackSelect`; the main remaining readability work is to simplify that update path and make toolbar-driven config changes easier to follow.
