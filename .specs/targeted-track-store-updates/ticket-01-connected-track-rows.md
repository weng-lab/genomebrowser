# Ticket 01: Restore connected track rows

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R1, R2, R4, R5, R9, R10
**Blocked by:** None

## Outcome

Browser composition follows stable structural and layout state, while each rendered row selects its own complete track instance by ID. Updating one track's presentation rerenders that row without traversing unrelated rows, and height or ordering changes still update geometry correctly.

## Scope

- Introduce a browser-scoped connected row boundary keyed by track ID.
- Change track-stack composition to use stable ordered IDs and the layout information it actually owns.
- Preserve validated immutable `updateTrack` behavior and the public track-store API.
- Cover presentation, height, add/remove, and reorder behavior at the narrowest practical test seams.

## Acceptance Criteria

- [x] `updateTrack` continues to replace only the addressed track object, preserves unchanged object identities, and does not change `order`.
- [x] A connected row subscribes to its track through the `trackStore` supplied to that browser instance.
- [x] Updating one track's color rerenders that row and not an unrelated row in a focused harness.
- [x] Updating track height updates total SVG height and following row positions.
- [x] Add, remove, replace, and reorder operations update rendered row membership and order.
- [x] No broad component memoization is introduced as the invalidation mechanism.
- [x] The public track-store mutation API remains unchanged.

## Verification

Use focused track-store and track-stack/browser tests for identity, render isolation, layout, and structural operations. Run core type checking and the directly affected test files. Keep verification below half of the ticket effort.

## Starting Points

- `packages/core/src/browser/state/trackStore.ts`
- `packages/core/src/browser/GenomeBrowser.tsx`
- `packages/core/src/browser/track-row/TrackStack.tsx`
- `packages/core/src/browser/track-row/TrackFrame.tsx`
- `packages/core/src/browser/track-row/trackLayout.ts`
- Historical reference: commit `d7ac021`, especially `DisplayTrack` selecting `state.getTrack(id)`.

## Constraints

- Preserve browser-instance isolation; do not import or assume a singleton track store.
- Track removal must not leave a connected row reading a missing track.
- Follow the existing immutable validation boundary.

## Out of Scope

- Data-fetch subscription isolation.
- Swap subscription changes.
- Color-picker implementation changes.

## Amendments

### A001 - Establish production row isolation

- **Supersedes:** Scope and Out of Scope treatment of swap and browser-level subscriptions, plus acceptance criterion “Updating one track's color rerenders that row and not an unrelated row in a focused harness.”
- **Replacement:** Ticket 01 must remove every complete-track-array subscription that directly rerenders `GenomeBrowser` or unrelated production track rows, including the minimum `useTrackSwap` change needed to establish production row isolation. The acceptance criterion applies to the real `GenomeBrowser` and `TrackRow` path, not a mocked row harness. Ticket 02 still owns fetch-signature-aware data synchronization, and Ticket 03 still owns comprehensive current-order swap regression coverage.
- **Reason:** Review established that deferring these broad subscriptions leaves the ticket's primary production outcome unimplemented.
