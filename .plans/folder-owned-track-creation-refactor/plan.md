# TrackSelect As Browser Track Controller

## Problem

The current integration splits responsibility across two different models. `TrackSelect` owns selected IDs while the browser separately owns concrete tracks in `trackStore`. The consumer then has to glue those together by generating tracks, diffing inserts/removals, restoring session state, and keeping things coherent. That logic is currently living in the test harness, is hard to read, and is annoying to port to other sites.

## Solution

Make `TrackSelect` the browser-facing controller for managed tracks.

`TrackSelect` should accept the folder registry, `assembly`, a session storage key, the browser `trackStore`, and a default list of managed track IDs. It becomes responsible for restoring managed state, deriving folder-backed tracks, and mutating the store directly when the user changes selection.

To keep the implementation readable, folder-specific track creation moves into the folder definitions through a required `createTrack(...)` API. That keeps `TrackSelect` coupled to the browser, but not coupled to folder-specific branching logic.

## Expected Behavior

- A site can render `TrackSelect` by passing `trackStore`, `assembly`, folders, a session key, and default managed IDs.
- If managed IDs exist in session storage, `TrackSelect` restores from that state.
- If no session state exists, `TrackSelect` uses the provided default managed IDs.
- `TrackSelect` recreates the corresponding folder-backed tracks into `trackStore`.
- When the user adds or removes managed tracks in the modal, `TrackSelect` updates `trackStore` directly.
- The browser simply renders whatever is in `trackStore`.
- Tracks in `trackStore` that do not map to folder rows remain visible in the browser but are ignored by `TrackSelect`.
- Adding a new folder does not require editing a central folder-type switch.

## Implementation Decisions

- `TrackSelect` becomes the primary integration surface for managed browser tracks.
- `trackStore` is the shared model used by both `TrackSelect` and `Browser`.
- `TrackSelect` is the controller for the folder-backed subset of tracks in that store.
- Folder definitions gain a required `createTrack(row, options)` API.
- `TrackSelect` stays folder-agnostic and should not branch on folder IDs or folder types to create tracks.
- Managed state is persisted as selected managed IDs, not as serialized full track objects.
- Startup precedence is:
  session-managed IDs first, otherwise prop-provided default managed IDs.
- Ghost/external tracks remain in `trackStore` and browser output, but are ignored by managed selection logic.
- Reconciliation from arbitrary external store mutations should be considered a later enhancement and placed at the end of the work.
- Readability and simplification are explicit goals of the refactor.

## Testing Approach

- Add minimal `vitest` setup for `packages/ui`.
- Keep tests in `packages/ui/test/` alongside `main.tsx`.
- Test only business logic, not React/MUI internals or TypeScript-enforced behavior.
- Focus test coverage on:
  - folder `createTrack(...)` behavior
  - startup precedence: session state over default IDs
  - managed-track diff behavior against `trackStore`
  - ghost track ignore behavior
- Keep automated testing minimal and use manual verification in the local test harness for the more complex UI behavior.

## Out of Scope

- Redesigning the modal UI.
- Managing arbitrary non-folder tracks through `TrackSelect`.
- Full bidirectional reconciliation for every possible external `trackStore` mutation in the first pass.
- Preserving the old `onSubmit`-driven integration shape if it complicates the refactor.
- Broad UI test coverage or adding heavier frontend testing frameworks.
