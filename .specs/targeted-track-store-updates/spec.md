# Targeted track-store updates

**Status:** Ready

## Problem

Updating one track's presentation, such as dragging its color picker, currently causes `GenomeBrowser` to rerender its browser-level orchestration and traverse every track. The track store replaces only the changed track object, but `GenomeBrowser` subscribes to the complete `tracks` array, so every immutable track update invalidates the browser shell.

This regresses the targeted subscription behavior introduced by the earlier `d7ac021` re-render fix, where the browser subscribed to track IDs and each rendered track selected its own store entry. Continuous settings make the regression visible as a substantial frame-rate drop.

## Desired Outcome

A validated update for one track immediately updates that track's settings and renderer without rerendering unrelated track rows or restarting browser-level data and viewport coordination. Structural, layout, and fetch-relevant changes must still update the browser behavior they own.

## Current State

- `trackStore.updateTrack(id, update)` validates one candidate track and publishes a new `tracks` array containing the new track object and the unchanged objects for every other track.
- `order` remains referentially stable during `updateTrack`.
- `GenomeBrowser` subscribes to the complete `tracks` array and passes it through layout, render-window, data, and track-stack code.
- `useTrackData` runs its synchronization effect whenever the `tracks` array identity changes, even when no fetch signature changed.
- Every `useTrackSwap` instance also subscribes to the complete track array.
- `TrackContent` has a memoized leaf, but memoization is not the intended invalidation boundary and does not prevent browser and row orchestration from rerunning.
- Live settings updates, including color previews, are expected product behavior.

## Requirements

- **R1:** A successful `updateTrack` must continue to validate and atomically replace only the addressed track while preserving all unchanged track object identities and the existing order.
- **R2:** A presentation-only update to one track must rerender that track's row but must not rerender unrelated track rows.
- **R3:** A presentation-only update must not rerun browser-level render-window settlement or track-data synchronization.
- **R4:** The browser shell must observe structural changes, including add, remove, replace, and reorder operations.
- **R5:** Track height changes must update total browser height and downstream row positions.
- **R6:** Fetch-relevant track changes must trigger data synchronization for the affected track, while fields outside the module's fetch signature must not trigger fetching or loading state.
- **R7:** Track swapping must use current store state without subscribing every mounted row to the complete track array.
- **R8:** Settings must remain live; no debounce, Apply/Cancel transaction, or delayed store commit is introduced as a substitute for correct invalidation.
- **R9:** The public track-store mutation API and validated track-instance contract must remain unchanged.
- **R10:** Correctness must come from store subscription ownership and stable state domains, not from broad component memoization added to mask invalid updates.
- **R11:** Regression coverage must distinguish presentation-only, layout, fetch-relevant, and structural updates.
- **R12:** User-facing documentation must continue to describe live settings accurately; internal subscription mechanics do not require a new public concept.

## Technical Decisions

### Store and row ownership

The track store remains the single source of truth. Immutable updates are retained because Zustand selectors rely on unchanged track object identity to avoid notifying unrelated rows.

Browser composition is keyed by the stable `order` domain. A connected row boundary receives a track ID and selects that track directly from the supplied browser-scoped track store. The row, rather than `GenomeBrowser`, owns the subscription to the complete track instance.

The implementation must not introduce a globally assumed track store. Multiple browser instances remain isolated through the `trackStore` prop and existing browser context.

### Invalidation domains

Track state has three relevant invalidation domains:

1. **Structure and layout:** ordered IDs and browser-owned dimensions required to calculate SVG height and row positions.
2. **Fetch inputs:** module-defined fetch signatures and track membership required by data synchronization.
3. **Per-track rendering:** the complete validated track instance used by one row and its settings.

Consumers subscribe to the narrowest domain they own. Presentation fields such as color may change the per-track rendering domain without changing structure, layout, or fetch inputs.

The implementation may derive stable internal snapshots or maintain browser-internal coordination state, but it must not add revision counters that callers need to manage or expose a second public mutation path.

### Data coordination

Track-data coordination is isolated below the browser shell. It reacts to membership, region, and module fetch signatures rather than the identity of the complete `tracks` array. A presentation-only update leaves settled data and interaction gating unchanged.

### Track swapping

Swap gesture rendering may subscribe to explicit transient swap state. The ordered track list needed to begin or calculate a swap is read from the current store at interaction time or from the stable structural domain; each row does not subscribe independently to complete track instances it does not render.

## Verification Strategy

- Store tests retain coverage for validated atomic replacement, stable order, and unchanged object identities.
- Focused render-count tests use a small browser or row harness to prove that changing one track color updates only that connected row.
- Layout tests prove height changes update total height and following row positions.
- Data tests prove presentation updates do not enter fetching state, while a fetch-signature change fetches the affected track.
- Swap tests prove gestures use current ordering after add, remove, and reorder operations without broad row subscriptions.
- Run focused core and UI tests plus package type checking and linting. Validation should remain proportionate and consume less than half of implementation effort.

## Out of Scope

- Debouncing or delaying live settings to conceal broad rerenders.
- Broad React memoization as the primary correction.
- Replacing Zustand or changing the public track-store mutation API.
- Simplifying or replacing the color picker implementation.
- Changing module render or fetch contracts.
- Compatibility aliases or temporary exports.
- General browser performance work unrelated to track-store invalidation.

## Risks and Edge Cases

- Reading only ordered IDs at the browser boundary is insufficient by itself because height changes must still update SVG and row geometry.
- Fetch coordination must not miss a config change marked with `fetchOnChange`, including changes that preserve track identity and order.
- Per-row selectors must handle removal without briefly rendering a stale track or throwing during the structural transition.
- Automatic track-height updates can originate from renderers and must not create feedback loops between layout and row subscriptions.
- Swap calculations must not capture an order that becomes stale between render and gesture start.
