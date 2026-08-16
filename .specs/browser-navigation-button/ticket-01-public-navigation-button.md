# Ticket 01: Public store-bound navigation button

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R3–R12, A001
**Blocked by:** None

## Outcome

Consumers can import `BrowserNavigationButton` and its public types, bind it to a real browser store, and compose independently styled pan and zoom controls whose behavior follows the public API.

## Scope

Add the UI primitive and package-root exports. Exercise it through rendered buttons backed by `createBrowserStore`, emphasizing observable navigation, disabled state, accessibility, and MUI prop behavior rather than unit-testing internal helpers.

## Acceptance Criteria

- [ ] The UI package root exports `BrowserNavigationButton`, `BrowserNavigationButtonProps`, and the discriminated `BrowserNavigationAction` union.
- [ ] Props require `browserStore` and one pan or zoom action, accept ordinary MUI `ButtonProps`, and do not expose consumer replacement of the navigation `onClick` behavior.
- [ ] Pan actions read the latest store state, shift by the signed fraction of the current viewport, round to a whole base with a minimum one-base movement, preserve span, clamp at chromosome boundaries, and commit through the store's `setRegion`.
- [ ] Zoom actions read the latest store state and call its existing center-based `zoom(factor)` behavior without changing core APIs or zoom semantics.
- [ ] Replacing the `browserStore` prop updates both the subscription and subsequent activation target.
- [ ] The button subscribes only to state needed for availability and does not rerender for unrelated store changes.
- [ ] Coarse disabled behavior covers invalid declarations or regions, directional chromosome edges, one-base zoom-in, chromosome-span zoom-out, and consumer-supplied `disabled`; valid near-one factors need not be predicted as rounded no-ops.
- [ ] Generated accessible names are exactly the applicable concise direction—`Pan left`, `Pan right`, `Zoom in`, or `Zoom out`—unless the consumer supplies an accessible name.
- [ ] Children, icons, variant, size, styling, and native keyboard/button behavior remain consumer-controlled through MUI props.
- [ ] The primitive adds no tooltip, grouping, ordering, wrapping, icons, or fixed visual preset.

## Verification

Use public imports and real browser-store instances in component tests. Cover representative left/right pan and in/out zoom actions, changed store state between render and activation, store replacement, each coarse disabled boundary, invalid actions, explicit and generated names, icon-only children, keyboard activation, and an unrelated store update. Include a package-root type-level assertion that `onClick` is excluded and both action variants are accepted.

## Starting Points

- `packages/ui/src/lib.ts`
- `packages/ui/src/BrowserNavigationControls/browserNavigationControls.tsx` contains the pan calculation to preserve, but the new primitive should be a separately named public component.
- `packages/core/src/browser/state/browserStore.ts` defines `BrowserStoreInstance`, `setRegion`, and `zoom`.
- Follow the `GenomeBrowser` convention: alias the `browserStore` prop to a `use...` identifier for hook use, and call `getState()` at activation time.

## Constraints

- Do not add or modify a core navigation API.
- Do not alter existing core zoom or normalization behavior.
- Keep availability boundary-based; do not introduce capability APIs or exact mutation previews.
- Keep generated names directional and concise; do not add magnitude-formatting machinery.
- Do not expose a standard toolbar or fixed button collection.

## Out of Scope

- Removing or migrating `BrowserNavigationControls` and its consumers; Ticket 02 owns the atomic migration.
- Final application toolbar design.
- Drag panning, pointer-centered zoom, navigation history, analytics, or press-and-hold behavior.
