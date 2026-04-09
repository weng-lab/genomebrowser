# Slice 2: Submit Only Applies Add/Remove Diff

## Dependencies

Slice 1: Remove Ordering State From TrackSelect.

## Description

Change submit so it compares the current managed IDs in `trackStore` against the modal draft and only removes deselected tracks and appends newly selected tracks. Existing selected managed tracks stay untouched. Update the submit-path tests in the same slice.

## Expected Behaviors Addressed

- Submitting without changes does not recreate tracks.
- Existing managed tracks keep user-edited properties like `height`.
- Deselected managed tracks are removed.
- Newly selected managed tracks are appended to the bottom.
- Unmanaged tracks remain untouched.

## Acceptance Criteria

- [ ] Submit computes add/remove differences from the current managed tracks in `trackStore`.
- [ ] Existing managed tracks that remain selected are not recreated.
- [ ] Newly selected managed tracks are created and appended to the bottom of the store.
- [ ] Deselected managed tracks are removed without affecting unmanaged tracks.
- [ ] Tests cover no-op submit, add, remove, and preservation of existing edited tracks.

## QA

1. Load a page with managed tracks already visible in the browser.
2. Change the height of one managed track.
3. Open TrackSelect and click Submit without changing selections.
4. Confirm the edited track height is preserved.
5. Reopen TrackSelect, add one managed track, submit, and confirm it appears at the bottom.
6. Reopen TrackSelect, remove one managed track, submit, and confirm only that track disappears.
7. Run the relevant `packages/ui` tests covering TrackSelect submit behavior.

---

_Appended after execution._

## Completion

**Built:** Updated managed-track submit handling to diff the current managed tracks in `trackStore` against the modal draft, so unchanged managed tracks stay intact, deselected managed tracks are removed, and newly selected managed tracks are appended. Added helper tests covering no-op submit, add, remove, and preservation of edited managed tracks.

**Decisions:** Kept the existing helper entry point and changed its behavior in place to minimize component churn. This slice uses the store's existing `removeTrack` and `insertTrack` operations directly, removing deselected tracks before appending any newly selected tracks.

**Deviations:** Manual UI QA was not run in this session because the plan marks starting the dev server as out of scope. The helper name still references replacement even though the implementation is now diff-based, which keeps this slice small and avoids a broader rename.

**Files:** Modified `packages/ui/src/TrackSelect/managedTracks.ts`, `packages/ui/test/startup.test.ts`, and this slice file.

**Notes for next slice:** The diff-based behavior now works with per-track store operations. The next slice can add batch store operations and swap this helper over to them without changing the user-facing behavior or the coverage added here.
