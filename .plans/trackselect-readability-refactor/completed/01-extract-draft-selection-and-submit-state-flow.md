# Slice 1: Extract draft selection and submit state flow

## Dependencies

None.

## Description

Move the modal draft selection lifecycle out of `TrackSelect` into one small state seam so the component no longer directly owns initialization, reset, clear, submit preparation, and selection updates. End-to-end, the modal should still open with the current managed selections, allow local edits, and submit the same add and remove diff behavior, but the top-level component should mostly wire UI to a simpler state API.

## Expected Behaviors Addressed

- `TrackSelect` remains functionally the same from the user's perspective.
- Opening the modal still derives draft selection from the current browser tracks.
- Changing selections in the modal stays local until submit.
- Submitting still only adds newly selected managed tracks and removes deselected managed tracks.
- Existing managed tracks that stay selected are preserved as-is.
- Reset still restores the draft selection from the current browser state.
- Clear still clears the current folder or all folders depending on the current view.
- The top-level component reads top-to-bottom as layout plus event wiring, not as a mixed state machine.

## Acceptance Criteria

- [ ] `TrackSelect` no longer contains the core draft selection transition logic inline.
- [ ] Submit, reset, and clear behavior stay unchanged.
- [ ] Existing tests for managed-track preservation and add, remove, and preserve behavior still pass, with focused state tests added if needed.

## QA

1. Open the modal with existing managed tracks already in the browser.
2. Confirm those tracks appear selected.
3. Change selections without submitting and confirm browser tracks do not change.
4. Click Reset and confirm selections return to the current browser state.
5. Click Clear in folder detail view and confirm only that folder's draft selection clears.
6. Click Clear from folder list view and confirm all draft selections clear.
7. Submit unchanged selections and confirm existing managed tracks are preserved without reset.
8. Submit added and removed selections and confirm only the diff is applied.

---

## Completion

**Built:** Extracted TrackSelect draft-selection, folder-navigation, clear, reset, tree-removal, and submit behavior into a small `useTrackSelectState` seam, with focused helper tests for the extracted transitions.

**Decisions:** Kept runtime config and derived tree/grid shaping in `TrackSelect` for later slices; exposed pure helper functions from the hook module so the selection lifecycle can be tested without rendering the dialog.

**Deviations:** Moved folder navigation into the same state seam because clear behavior depends on the current view and active folder, which kept the extracted API simpler.

**Files:** `packages/ui/src/TrackSelect/TrackSelect.tsx`, `packages/ui/src/TrackSelect/useTrackSelectState.ts`, `packages/ui/test/trackSelectState.test.ts`

**Notes for next slice:** `TrackSelect` still owns runtime config state and the derived `rows`/`folderTrees` view data; those are the main remaining readability hotspots after this extraction.
