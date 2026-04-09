# Slice 5: Ghost Tracks And Late Reconciliation

## Dependencies

Slice 3: TrackSelect Mutates TrackStore Directly.

## Description

Handle tracks that already exist in `trackStore` but do not map to any folder row. Those ghost or external tracks should remain visible in the browser while being ignored by `TrackSelect`'s managed selection logic. Add a light reconciliation pass only if it is needed to keep store-driven behavior sane after external store changes.

## Expected Behaviors Addressed

- Tracks in `trackStore` that do not map to folder rows remain visible in the browser but are ignored by `TrackSelect`.
- Reconciliation from arbitrary external store mutations is considered as a later enhancement.

## Acceptance Criteria

- [ ] Ghost or external tracks remain in `trackStore` and continue rendering in the browser.
- [ ] Ghost or external tracks do not appear as managed selections in `TrackSelect`.
- [ ] Any reconciliation added in this slice stays minimal and focused on keeping managed state sane.

## QA

1. Inject or pre-seed a non-folder-backed track into the local UI test harness store.
2. Open the modal and confirm the ghost track does not appear as a managed selection.
3. Confirm the ghost track still renders in the browser.
4. Change managed selections and verify the ghost track remains untouched.
5. Run the `packages/ui` vitest suite covering ghost-track ignore behavior.

---

_Appended after execution._

## Completion

**Built:** Added a minimal managed-selection reconciliation path so external or ghost tracks already present in `trackStore` remain visible but never become managed selections, and stale managed selections are dropped if some other store consumer removes those tracks directly. Added vitest coverage for both ghost-track ignore behavior and late external-removal reconciliation.

**Decisions:** Reconciliation is one-way and intentionally conservative: `TrackSelect` only removes managed selections that no longer exist in `trackStore`; it does not infer new managed selections from arbitrary store contents. This keeps ghost tracks and externally inserted tracks visible in the browser without letting `trackStore` become the source of truth for managed selection.

**Deviations:** I did not run the manual harness QA because the repo instructions explicitly say not to run `pnpm run dev`. The reconciliation added here is deliberately narrower than full bidirectional store syncing so this slice stays aligned with the plan's "later enhancement" scope.

**Files:** Modified `packages/ui/src/TrackSelect/TrackSelect.tsx`, `packages/ui/src/TrackSelect/managedTracks.ts`, `packages/ui/test/startup.test.ts`, and moved this slice file to `.plans/folder-owned-track-creation-refactor/completed/05-ghost-tracks-and-late-reconciliation.md`.

**Notes for next slice:** Managed selection now tolerates ghost tracks and direct external removals from `trackStore`, but external decoration or callback reinjection still has no dedicated hook. If slice 6 adds decoration support, it should build on the existing internal managed-track apply path rather than making `trackStore` the driver of new selections. Verified commands: `pnpm --filter @weng-lab/genomebrowser-ui test` and `pnpm --filter @weng-lab/genomebrowser-ui build`.
