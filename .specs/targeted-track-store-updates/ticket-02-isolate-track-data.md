# Ticket 02: Isolate track-data invalidation

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R3, R6, R8
**Blocked by:** Ticket 01

## Outcome

Track-data and render-window coordination react to track membership and module fetch signatures rather than complete track-array identity. Live presentation updates leave settled data and interaction gating undisturbed, while fetch-relevant updates still load the affected track.

## Scope

- Isolate data coordination from browser-shell and row rendering subscriptions.
- Make render-window track membership depend on stable ordered IDs.
- Prevent presentation-only updates from rerunning data synchronization or creating transient fetching state.
- Preserve module-defined `fetchOnChange` behavior and live settings commits.

## Acceptance Criteria

- [x] Changing only track color does not invoke track fetching, reset settled data, or enter fetching state.
- [x] Changing a field included in the module fetch signature fetches the affected track.
- [x] Region changes and initial loading continue to fetch all required tracks.
- [x] Add and remove operations update data membership and prune removed results.
- [x] Render-window settlement changes when track membership changes, not when a presentation-only field changes.
- [x] Settings continue to commit accepted changes immediately.

## Verification

Extend focused `useTrackData` and render-window tests for presentation-only, fetch-relevant, membership, and region changes. Run the affected core tests and type checking. Keep verification below half of the ticket effort.

## Starting Points

- `packages/core/src/browser/data/useTrackData.ts`
- `packages/core/src/browser/data/dataStore.ts`
- `packages/core/src/browser/viewport/useRenderWindow.ts`
- `packages/core/src/modules/fetchOnChange.ts`
- `packages/core/src/browser/GenomeBrowser.tsx`

## Constraints

- Module fetch signatures remain the authority for config-driven refetching.
- Do not delay or debounce store mutations to avoid data work.
- Do not expose internal subscription snapshots as public API.

## Out of Scope

- General fetch caching or request deduplication.
- Changing module fetch contracts.
- Swap behavior.
