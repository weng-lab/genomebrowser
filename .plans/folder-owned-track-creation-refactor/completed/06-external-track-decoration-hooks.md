# Slice 6: External Track Decoration Hooks

## Dependencies

Slice 4: Remove Double-State From Test Harness.

## Description

Add a narrow, obvious way for consumers to decorate managed tracks created by `TrackSelect`, such as attaching click handlers, hover behavior, or tooltip-related track callbacks. This slice only happens after the controller refactor is stable, and it should avoid reintroducing double-state or a large integration surface.

## Expected Behaviors Addressed

- Consumers have a simple way to attach extra behavior to managed tracks when needed.
- The core controller refactor remains readable and does not depend on decorator complexity.

## Acceptance Criteria

- [x] `TrackSelect` exposes a small API for decorating managed tracks after creation and before insertion into `trackStore`.
- [x] The API is sufficient to support the current test harness callback use case.
- [x] Decoration support does not reintroduce consumer-owned managed selection state.

## QA

1. Open the local UI test harness with decoration enabled through the new API.
2. Interact with at least one decorated transcript track and one decorated BigBed track.
3. Confirm the expected click or hover behavior still fires.
4. Confirm managed track add/remove behavior still works exactly as before.

---

_Appended after execution._

## Completion

**Built:** Added a single `decorateManagedTrack` hook on `TrackSelect` that runs after folder-owned track creation and before managed tracks are inserted into `trackStore`. Wired the UI test harness to use it for transcript click logging and BigBed hover logging, and added vitest coverage that decorated managed tracks are the ones written to the store.

**Decisions:** Kept the API to one callback that receives `{ assembly, folder, row, track }` and returns the final track (or `null` to skip insertion). The decoration is applied inside the existing managed-track replacement path so consumers can add callbacks without taking back ownership of selection state, persistence, or diffing.

**Deviations:** Manual harness QA was not run because the repo instructions explicitly say not to run `pnpm run dev`, so the local interactive checks remain unverified in this session. I kept the decorator generic instead of adding type-specific hooks so transcript and BigBed use cases both fit the same narrow surface.

**Files:** Modified `packages/ui/src/TrackSelect/TrackSelect.tsx`, `packages/ui/src/TrackSelect/managedTracks.ts`, `packages/ui/test/main.tsx`, `packages/ui/test/startup.test.ts`, and moved this slice file to `.plans/folder-owned-track-creation-refactor/completed/06-external-track-decoration-hooks.md`.

**Notes for next slice:** Managed-track decoration now has a stable insertion point inside `TrackSelect`, so future callback/tooltip additions should build on this hook rather than reviving external managed-track synchronization. Verified commands: `pnpm --filter @weng-lab/genomebrowser-ui test` and `pnpm --filter @weng-lab/genomebrowser-ui build`.
