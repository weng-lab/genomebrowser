# Slice 3: Add Batch Store Operations And Use Them

## Dependencies

Slice 2: Submit Only Applies Add/Remove Diff.

## Description

If the core store is missing bulk add/remove operations, add them and switch the TrackSelect diff path to use them. Update core and UI tests in the same slice to cover the new store API and its TrackSelect integration.

## Expected Behaviors Addressed

- TrackSelect applies add/remove changes through normal store operations instead of rebuilding the full track list.
- Multiple additions or removals happen cleanly in one submit flow.
- Core store API matches the diff-based TrackSelect behavior.

## Acceptance Criteria

- [ ] The core track store exposes bulk add/remove operations if they were previously missing.
- [ ] TrackSelect uses the bulk operations for diff-based submit changes.
- [ ] Bulk add appends tracks by default.
- [ ] Bulk remove deletes only the requested tracks.
- [ ] Core and UI tests cover the new store operations and TrackSelect integration.

## QA

1. Open TrackSelect with multiple managed tracks available but not yet selected.
2. Select several tracks, submit, and confirm they are appended to the bottom in one submit flow.
3. Reopen TrackSelect, deselect several managed tracks, submit, and confirm only those tracks are removed.
4. Confirm existing unmanaged tracks remain in place throughout.
5. Run the relevant `packages/core` and `packages/ui` tests covering store operations and TrackSelect integration.

---

_Appended after execution._

## Completion

**Built:** Added bulk `insertTracks` and `removeTracks` operations to the core track store and updated the TrackSelect diff submit path to use them for multi-track add/remove changes in one submit flow.

**Decisions:** Kept the existing single-track store methods and routed them through the new bulk APIs so current callers keep working while TrackSelect switches to batch mutations. Added focused unit coverage in `packages/core` for the new store API and extended the existing TrackSelect helper tests in `packages/ui` to cover multi-track add/remove behavior.

**Deviations:** There was no existing `packages/core` Vitest unit test file for the store, so this slice added a new focused store test file rather than modifying the Storybook-oriented test setup. Manual UI QA was not run in this session because the plan marks starting the dev server as out of scope.

**Files:** Modified `packages/core/src/store/trackStore.ts`, `packages/ui/src/TrackSelect/managedTracks.ts`, `packages/ui/test/startup.test.ts`, and this slice file. Created `packages/core/src/store/trackStore.test.ts`.

**Notes for next slice:** The TrackSelect submit path now uses batch store mutations, and the core store preserves the existing single-track API by delegating to the batch methods. No further pending slices remain in this plan after moving this file to `completed/`.
