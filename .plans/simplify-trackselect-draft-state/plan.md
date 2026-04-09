# Simplify TrackSelect Draft State

## Problem

`TrackSelect` got better after the managed-track refactor, but it still has more state plumbing than it needs. Right now it mixes a local selection store, React UI state, the browser `trackStore`, reconciliation logic, and internal session persistence. That makes the component harder to read and reason about than it should be for what is basically a modal with draft edits.

The main issue is not that the feature is broken. It is that the maintenance story is still too heavy. There are too many layers involved in what should be a simple flow: open modal, make temporary edits, submit or cancel.

## Solution

Collapse `TrackSelect` down to two layers:

- local React state for draft modal state
- `trackStore` for committed browser state

`TrackSelect` should stop owning session persistence and stop using a local selection store abstraction. While the modal is open, edits stay local. On `Submit`, `TrackSelect` converts the draft into managed tracks and writes them into `trackStore`. On `Cancel`, it throws the draft away.

Instead of restoring defaults from internal session-storage-backed managed IDs, `TrackSelect` should derive its initial draft selection from the current managed tracks already present in `trackStore`. That keeps initialization aligned with the real committed browser model and lets persistence move cleanly into a separate integration layer elsewhere in the UI package.

The browser store remains the real model. `TrackSelect` becomes a simpler draft editor for the managed subset of that model.

## Expected Behavior

- Opening `TrackSelect` initializes the draft from the current committed managed tracks already in `trackStore`.
- While the modal is open, selecting and deselecting tracks only changes the draft UI state.
- The browser does not change while the user is still editing.
- Clicking `Submit` applies the draft into the browser `trackStore`.
- Clicking `Cancel` closes the modal and discards all draft changes from that session.
- Unmanaged tracks already in `trackStore` remain visible and untouched.
- Managed tracks are inserted in the order they were selected.
- External persistence, if used, restores committed tracks into `trackStore` before `TrackSelect` opens.
- `TrackSelect` treats the managed tracks already present in `trackStore` as its initial selection state rather than owning separate default/session initialization.
- Folder-owned track creation continues to work the same way as it does now.

## Implementation Decisions

- `trackStore` is the committed source of truth for browser tracks.
- `TrackSelect` owns only draft state and modal UI state.
- Draft state should use plain React state rather than a local zustand store.
- `TrackSelect` should not read from or write to session storage directly.
- Persistence should move to a separate integration layer outside `TrackSelect`, likely elsewhere in the UI package.
- `TrackSelect` should derive its initial draft selection from the current managed tracks already present in `trackStore`.
- The draft model should preserve first-selection order so submit order is deterministic.
- Folder membership should be derivable from the managed track ID format, which includes the folder prefix.
- `TrackSelect` should stage changes locally and only write to `trackStore` on `Submit`.
- `Cancel` should not need rollback logic because committed browser state remains untouched during editing.
- Helper logic for building managed tracks and replacing the managed subset in `trackStore` should stay separate from the UI rendering code.
- Broad external reconciliation should not drive the design, since other store mutation paths are not part of the real usage model.

## Testing Approach

Focus tests on behavior and state transitions rather than UI internals.

Tests should cover:

- draft initialization from the managed tracks already present in `trackStore`
- no `trackStore` mutation before `Submit`
- `Submit` applying the draft to `trackStore`
- `Cancel` discarding draft changes
- preservation of unmanaged tracks during managed replacement
- managed track ordering matching selection order
- folder-owned `createTrack(...)` behavior continuing to produce the same tracks
- managed track decoration still applying before insertion if that hook remains
- external persistence integration restoring tracks into `trackStore` in a way that `TrackSelect` correctly treats as its initial state

Use small business-logic tests for track derivation and replacement behavior. Keep heavier UI verification minimal and focused on the draft-versus-submit lifecycle.

## Out of Scope

- redesigning the `TrackSelect` UI
- changing folder-owned track creation contracts
- defining a custom ordering system beyond first-selection order
- supporting arbitrary external mutation flows that do not exist in practice
- making `TrackSelect` responsible for track-store persistence
- broad new feature work beyond simplifying state ownership and submit behavior
