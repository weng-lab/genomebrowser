# Slice 2: TrackSelect Startup From Managed IDs

## Dependencies

Slice 1: Folder-Owned Track Creation.

## Description

Teach `TrackSelect` to start from managed track IDs instead of consumer-owned submit plumbing. On startup, it should restore managed IDs from session storage when available, otherwise fall back to a provided default managed ID list, and then recreate the corresponding folder-backed tracks into `trackStore`.

## Expected Behaviors Addressed

- A site can render `TrackSelect` by passing `trackStore`, `assembly`, folders, a session key, and default managed IDs.
- If managed IDs exist in session storage, `TrackSelect` restores from that state.
- If no session state exists, `TrackSelect` uses the provided default managed IDs.
- `TrackSelect` recreates the corresponding folder-backed tracks into `trackStore`.

## Acceptance Criteria

- [ ] `TrackSelect` accepts browser-facing startup props for managed IDs and session storage.
- [ ] Session-managed IDs take precedence over prop-provided default managed IDs.
- [ ] Managed tracks are recreated into `trackStore` from the chosen startup ID source.

## QA

1. Clear session storage for the UI test harness and load the page.
2. Confirm the default managed IDs are used to seed tracks into the browser.
3. Save a different managed selection in session storage and reload.
4. Confirm the saved managed IDs win over the default list.
5. Run the `packages/ui` vitest suite covering startup precedence logic.

---

_Appended after execution._

## Completion

**Built:** `TrackSelect` now accepts browser-facing startup props for `assembly`, `trackStore`, `storageKey`, and `defaultManagedIds`, restores managed selection from session storage before defaults, and seeds the browser `trackStore` from the selected managed IDs on startup.

**Decisions:** Startup seeding is implemented as a one-time `TrackSelect` effect that rebuilds only folder-managed tracks and preserves any existing non-managed tracks already present in `trackStore`. The managed-track reconstruction logic was pulled into a small shared helper so startup precedence and track-store seeding could be tested without rendering React UI.

**Deviations:** I did not run the local UI harness manual QA because the repo instructions explicitly say not to run `pnpm run dev`. Automated QA covers the startup precedence and managed-track seeding behavior instead.

**Files:** Modified `packages/ui/src/TrackSelect/TrackSelect.tsx`, `packages/ui/src/TrackSelect/store.ts`, and `packages/ui/test/main.tsx`. Added `packages/ui/src/TrackSelect/managedTracks.ts` and `packages/ui/test/startup.test.ts`.

**Notes for next slice:** `TrackSelect` now owns startup restoration into `trackStore`, but modal submit still flows through the consumer `onSubmit` callback. Slice 3 should replace that remaining submit plumbing so TrackSelect mutates the managed subset of `trackStore` directly on commit. Verified commands: `pnpm --filter @weng-lab/genomebrowser-ui test` and `pnpm --filter @weng-lab/genomebrowser-ui build`.
