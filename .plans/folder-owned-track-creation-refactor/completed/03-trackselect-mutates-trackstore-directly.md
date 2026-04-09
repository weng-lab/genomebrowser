# Slice 3: TrackSelect Mutates TrackStore Directly

## Dependencies

Slice 2: TrackSelect Startup From Managed IDs.

## Description

Make `TrackSelect` directly manage the folder-backed subset of tracks in `trackStore`. User selection changes in the modal should compute the managed add/remove diff and apply it to the store without relying on `onSubmit` or external consumer glue code.

## Expected Behaviors Addressed

- When the user adds or removes managed tracks in the modal, `TrackSelect` updates `trackStore` directly.
- The browser simply renders whatever is in `trackStore`.

## Acceptance Criteria

- [ ] The managed-track integration path no longer depends on consumer-owned `onSubmit` / `onClear` callbacks.
- [ ] Selecting a folder-backed track inserts it into `trackStore`.
- [ ] Deselecting a managed folder-backed track removes it from `trackStore` while leaving unrelated tracks alone.

## QA

1. Open the local UI test harness.
2. Add a managed track from the modal and confirm it appears in the browser.
3. Remove the same managed track and confirm it disappears from the browser.
4. Use reset and clear flows and confirm the browser matches the managed selection state.
5. Run the `packages/ui` vitest suite covering managed diff behavior against `trackStore`.

---

_Appended after execution._

## Completion

**Built:** `TrackSelect` now applies managed selection changes directly into the browser `trackStore` for row selection, tree removals, clear, and reset flows. `Submit` now just commits the current managed snapshot and closes, while `Cancel` restores the last committed managed selection back into both the selection store and `trackStore`.

**Decisions:** I added a `replaceSelection(...)` store action so `TrackSelect` can apply whole managed-selection snapshots atomically when diffing, clearing, resetting, and cancelling. Reset and clear now behave like other in-modal edits: they update the browser immediately, but remain revertible until `Submit` commits them.

**Deviations:** I did not run the manual harness QA because the repo instructions explicitly say not to run `pnpm run dev`. Automated QA covers the managed add/remove replacement behavior against `trackStore`, including preservation of unrelated ghost tracks.

**Files:** Modified `packages/ui/src/TrackSelect/TrackSelect.tsx`, `packages/ui/src/TrackSelect/store.ts`, `packages/ui/src/TrackSelect/types.ts`, `packages/ui/test/main.tsx`, and `packages/ui/test/startup.test.ts`.

**Notes for next slice:** `TrackSelect` no longer exposes the old consumer-owned `onSubmit` / `onClear` integration path in the UI harness path; managed browser updates now flow through the internal `applyManagedSelection(...)` path. Managed tracks are still recreated as plain folder tracks, so any later track decoration or callback reinjection should build on that internal apply path rather than reintroducing external diff logic. Verified commands: `pnpm --filter @weng-lab/genomebrowser-ui test` and `pnpm --filter @weng-lab/genomebrowser-ui build`.
