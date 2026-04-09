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

What was built. Key decisions made during implementation. Any deviations from the slice plan and why. Files created or modified. Anything the next slice should be aware of.
