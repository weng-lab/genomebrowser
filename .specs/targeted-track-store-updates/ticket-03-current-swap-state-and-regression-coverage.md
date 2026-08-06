# Ticket 03: Use current swap state and close regressions

**Status:** Ready
**Spec:** `./spec.md`
**Requirements:** R7, R11, R12
**Blocked by:** Ticket 01, Ticket 02

## Outcome

Track swapping reads current structural state without making every row subscribe to the full track array, and concise integration coverage protects the presentation, layout, fetch, and structural invalidation boundaries.

## Scope

- Remove whole-array subscriptions from per-row swap behavior.
- Read current order and required track geometry from the store at interaction time or through the stable structural domain.
- Add a small integration regression suite spanning the invalidation domains established by the first two tickets.
- Update user-facing documentation only where the existing live-settings description needs correction.

## Acceptance Criteria

- [ ] Mounted rows do not subscribe individually to the complete `tracks` array for swap behavior.
- [ ] Swap calculations use the latest order after add, remove, and reorder operations.
- [ ] Drag preview and committed reorder behavior remain unchanged from the user's perspective.
- [ ] Regression tests cover presentation-only row isolation, height/layout updates, fetch-relevant updates, and membership/order changes without duplicating lower-level coverage.
- [ ] Existing documentation accurately describes live settings and does not expose internal subscription mechanics as user concepts.
- [ ] Validation remains proportionate and consumes less than half of implementation effort.

## Verification

Run focused swap and browser integration tests, package type checking, linting, and formatting checks. Avoid broad new test matrices when existing lower-level tests already establish behavior.

## Starting Points

- `packages/core/src/browser/track-row/useTrackSwap.ts`
- `packages/core/src/browser/track-row/SwapTrack.tsx`
- `packages/core/src/browser/track-row/trackSwapMath.ts`
- Browser and store tests under `packages/core/test/`
- `packages/ui/docs/trackSettings.md`

## Constraints

- Current store state, not a render-time captured array, is authoritative when a gesture starts.
- Do not add compatibility layers or alternate reorder APIs.
- Do not use broad memoization to compensate for a broad subscription.

## Out of Scope

- New swap UX or animation.
- General performance benchmarking infrastructure.
- Color-picker simplification.

## Amendments

### A001 - Treat broad subscription removal as Ticket 01 work

- **Supersedes:** Scope item “Remove whole-array subscriptions from per-row swap behavior” and acceptance criterion “Mounted rows do not subscribe individually to the complete `tracks` array for swap behavior.”
- **Replacement:** Ticket 03 verifies and hardens the Ticket 01 swap-subscription correction, proving calculations use current order after structural changes and adding concise integration regression coverage. It does not reimplement the broad-subscription removal.
- **Reason:** Production row isolation cannot be established in Ticket 01 while each row still carries the broad swap subscription.
