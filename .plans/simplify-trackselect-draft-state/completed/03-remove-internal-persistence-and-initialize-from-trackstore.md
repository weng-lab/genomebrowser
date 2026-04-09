# Slice 3: Remove Internal Persistence And Initialize From TrackStore

## Dependencies

Slice 2: Submit Applies Managed Tracks In Selection Order.

## Description

Remove `TrackSelect` ownership of session storage and default-managed-id startup behavior. `TrackSelect` should now treat the current managed tracks already present in `trackStore` as its initial selection state so persistence can live outside the component.

## Expected Behaviors Addressed

- `TrackSelect` no longer reads from or writes to session storage.
- `TrackSelect` treats managed tracks already present in `trackStore` as its initial selection state.
- External persistence can restore committed tracks into `trackStore` before `TrackSelect` opens.
- `TrackSelect` stays focused on draft editing rather than persistence.

## Acceptance Criteria

- [x] `TrackSelect` no longer accepts or uses internal session-storage-driven startup props for managed selection.
- [x] Managed selection initialization comes from the current committed managed tracks already in `trackStore`.
- [x] Track persistence responsibilities are removed from `TrackSelect` and its old local selection store path.
- [x] The UI harness remains able to open `TrackSelect` against a preseeded `trackStore`.

## QA

1. Preseed the local UI harness `trackStore` with managed and unmanaged tracks.
2. Open `TrackSelect` and confirm the draft reflects the managed tracks currently present in the browser.
3. Close and reopen the modal without submitting changes and confirm the draft is rebuilt from the current committed browser state.
4. Review the `TrackSelect` API surface and confirm session-storage ownership is gone.
5. Run the `packages/ui` test suite covering initialization from committed `trackStore` state.

---

_Appended after execution._

## Completion

**Built:** Removed `TrackSelect`'s startup `storageKey` and `defaultManagedIds` props, made draft initialization and reset derive only from the currently committed managed tracks already in `trackStore`, removed session-storage persistence from the legacy selection-store helper, and updated the UI harness to preseed committed managed and unmanaged tracks directly into `trackStore`.

**Decisions:** Kept `trackStore` optional in the component API but made the no-store fallback an empty draft so committed browser state remains the only startup source when a store is present. Preserved the existing Reset UX by redefining it as a reset back to the current committed browser state instead of an internal default-selection snapshot.

**Deviations:** I did not run the manual local UI harness QA because repo guidance says not to start the dev server here. I covered the slice with the `packages/ui` Vitest suite and a successful `packages/ui` production build after updating the harness seeding path.

**Files:** Modified `.plans/simplify-trackselect-draft-state/completed/03-remove-internal-persistence-and-initialize-from-trackstore.md`, `packages/ui/src/TrackSelect/TrackSelect.tsx`, `packages/ui/src/TrackSelect/store.ts`, `packages/ui/src/TrackSelect/Dialogs/ResetDialog.tsx`, and `packages/ui/test/main.tsx`.

**Notes for next slice:** `TrackSelect` no longer owns startup persistence or default managed selections, and the remaining cleanup can focus on trimming unused helper/types/tests around the now-committed-state-driven model without changing modal behavior.
