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

What was built. Key decisions made during implementation. Any deviations from the slice plan and why. Files created or modified. Anything the next slice should be aware of.
