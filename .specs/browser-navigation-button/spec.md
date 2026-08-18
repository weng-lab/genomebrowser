# Store-bound browser navigation button

**Status:** Ready

## Problem

`BrowserNavigationControls` currently presents one fixed pan-and-zoom toolbar while also owning region validation, navigation calculations, boundary behavior, labels, and MUI presentation. This duplicates zoom behavior already owned by the core browser store and forces every consumer to accept the package's step choices and layout. Consumers cannot compose navigation controls that fit their application without bypassing the component and recreating its behavior.

## Desired Outcome

The UI package exposes one store-bound navigation-button primitive. Applications choose which navigation actions to show and own their arrangement, visible labels, icons, and surrounding tooltips, while the primitive subscribes to the supplied browser store, invokes core-owned pan or zoom behavior, and disables itself when its action cannot change the current region.

## Current State

- Core exports `BrowserStoreInstance`; its store owns the assembly, current region, `setRegion`, and center-based `zoom(factor)` behavior.
- Core does not expose a discrete pan action. Drag panning and `BrowserNavigationControls` calculate pan changes separately.
- `BrowserNavigationControls` receives `assembly`, `region`, and `onRegionChange` rather than the browser store used by `GenomeBrowser`.
- The component fixes pan steps at one quarter, one half, and one viewport and zoom magnitudes at 1.5×, 3×, and 10×.
- The component fixes grouping, ordering, wrapping, labels, tooltips, and outlined-button presentation.
- The standalone app and UI manual harness consume the fixed component.

## Requirements

- **R1:** Core must expose a browser-store `pan(fraction)` action, where the signed finite fraction is relative to the current viewport span, negative values move left, and positive values move right.
- **R2:** Core must remain the sole owner of pan and zoom region calculations, chromosome-boundary clamping, integer rounding, and mutation results; the UI component must not calculate replacement regions.
- **R3:** The UI package must export `BrowserNavigationButton` and its public prop and action types from the package root.
- **R4:** `BrowserNavigationButton` must require the `BrowserStoreInstance` used by the corresponding `GenomeBrowser` and one declarative action: signed fractional pan or multiplicative zoom.
- **R5:** Zoom actions must use the existing browser-store factor convention: factors between zero and one zoom in, and factors greater than one zoom out.
- **R6:** Activating an enabled button must invoke the declared action against the latest state of the supplied store rather than values captured during an earlier render.
- **R7:** The button must subscribe narrowly enough to update its enabled state when the current region changes without rerendering for unrelated browser-store changes.
- **R8:** The button must disable itself when its declared direction cannot change the current region at a chromosome or minimum-span boundary. A consumer-supplied `disabled` value must also disable it.
- **R9:** The component must use MUI `Button` and accept its ordinary presentation and accessibility props, except that consumers cannot replace the navigation click behavior.
- **R10:** Consumers must control button children, icons, variant, size, styling, ordering, grouping, wrapping, and optional tooltip presentation.
- **R11:** Every button must have an accessible action name. An explicit consumer-provided accessible name takes precedence; otherwise the component must derive an accurate name from the declared action.
- **R12:** The UI package must not export a standard navigation toolbar or fixed pan/zoom composition as part of this change.
- **R13:** `BrowserNavigationControls` and its props must be removed from the public API without a compatibility alias or temporary export.
- **R14:** Repository-owned consumers must migrate to explicit button compositions using their existing browser-store instance.
- **R15:** Public core and UI documentation must describe the pan action, action factor conventions, store binding, composition responsibilities, disabled behavior, and accessible naming.

## Technical Decisions

### Core navigation ownership

`BrowserStore` gains:

```ts
pan: (fraction: number) => BrowserRegionMutationResult;
```

The action interprets the fraction against the current region span, rounds movement to the nearest whole base with a minimum movement of one base, preserves viewport span, and clamps movement at chromosome boundaries. Non-finite or zero fractions fail without changing state using a pan-specific browser-region mutation error code.

The existing `zoom(factor, centerBase?)` API and factor semantics remain unchanged. `BrowserNavigationButton` uses center-based zoom by omitting `centerBase`.

### Public UI contract

The navigation action is a discriminated union:

```ts
export type BrowserNavigationAction =
  | { type: "pan"; fraction: number }
  | { type: "zoom"; factor: number };
```

`BrowserNavigationButtonProps` consists of:

- `browserStore: BrowserStoreInstance`
- `action: BrowserNavigationAction`
- ordinary MUI `ButtonProps`, excluding `onClick`

The store instance is explicit rather than obtained from a global store or implicit provider. This preserves isolation when multiple genome browsers are rendered and makes the controlled browser unambiguous.

`BrowserStoreInstance` is a Zustand bound store and therefore a React hook as well as an imperative store API. The public prop remains `browserStore`, matching `GenomeBrowser`, but the component immediately aliases it as `const useBrowserStore = browserStore`. It calls `useBrowserStore(selector)` for the region and assembly values needed to derive action availability, and invokes `useBrowserStore.getState().pan(...)` or `useBrowserStore.getState().zoom(...)` at activation time. This preserves hook semantics and ensures hook identifiers start with `use`.

### Composition ownership

The package owns genome-navigation semantics and native button interaction. The application owns toolbar design. In particular, the primitive does not add a tooltip, choose a MUI variant, prescribe icons, or group itself with neighboring controls.

Generated accessible names describe direction and effective magnitude, such as `Pan left by half a viewport`, `Zoom in 2×`, or `Zoom out 3×`. Button children remain entirely consumer-defined, so an application may render text, symbols, or icons without losing an accessible default.

### Invalid declarations

An action that cannot represent navigation, including a non-finite or zero pan fraction, a non-finite or non-positive zoom factor, or a zoom factor of one, is disabled and does not mutate the store. Core mutation methods remain responsible for runtime validation; the UI does not throw during rendering for an invalid declarative action.

## Verification Strategy

- Core store tests cover signed fractional panning, rounding, minimum one-base movement, both chromosome boundaries, viewport-span preservation, invalid fractions, and mutation results.
- UI tests prove each action invokes the latest supplied store state and uses core actions rather than calculating or passing replacement regions.
- UI tests cover automatic disabling at left, right, minimum-span, and chromosome-span boundaries, plus consumer-supplied and invalid-action disabling.
- Subscription-focused coverage proves unrelated browser-store updates do not rerender the button.
- Accessibility tests cover generated names, explicit overrides, text and icon-only children, native keyboard activation, and disabled behavior.
- Public-export type tests cover the component, props, and discriminated action union.
- The standalone app and UI manual harness provide representative custom compositions at wide and narrow widths.
- Package documentation examples use an existing browser-store instance and do not reintroduce fixed toolbar policy.

## Out of Scope

- Choosing the standalone application's final zoom-button visual design.
- Exporting a standard toolbar, preset step collection, pan group, zoom group, or compound-component API.
- Pointer-centered zoom or exposing `centerBase` through the button action.
- Navigation history, analytics callbacks, keyboard shortcuts outside native button activation, or press-and-hold repetition.
- Changing drag-panning interaction or viewport settlement behavior.
- Compatibility aliases or temporary exports for `BrowserNavigationControls`.

## Risks and Edge Cases

- A low-level primitive gives applications visual freedom but can produce inconsistent navigation sets across products. A convenience composition should be added only if repeated real usage establishes a stable standard.
- External controls do not inherently know whether browser orchestration has temporarily gated dangerous interactions. Consumers must continue to pass `disabled` when application-level settled or locked state requires it.
- Arbitrary fractions and factors make generated names less polished than the common quarter, half, and integer-magnitude cases; names must remain numerically accurate rather than implying a preset.
- Store replacement must update both subscriptions and activation behavior; an event handler must not continue mutating a previously supplied store instance.
- This intentionally removes a public component. Documentation and every repository-owned consumer must migrate in the same release because compatibility exports are prohibited.

## Amendments

### A001 - UI-only navigation primitive

- **Supersedes:** Desired Outcome; R1, R2, R8, R11, and R15; the "Core navigation ownership" section; the final paragraph of "Public UI contract"; the generated-name paragraph of "Composition ownership"; the generated-name risk in "Risks and Edge Cases"; and the Verification Strategy.
- **Replacement:** The UI package exposes one store-bound navigation-button primitive. Applications choose which navigation actions to show and own their arrangement, visible labels, icons, surrounding tooltips, and other presentation. The primitive subscribes to the supplied browser store, performs the declared navigation against its latest state, and uses simple boundary checks to disable directions that are unavailable.

  Core receives no new API as part of this work, and the existing `zoom(factor, centerBase?)`, `setRegion(region)`, normalization, and zoom-boundary behavior remain unchanged. Zoom activation calls `browserStore.getState().zoom(factor)` without a center base. Pan activation reads the latest region and assembly from `browserStore.getState()`, calculates a signed viewport-relative shift using the existing UI behavior, preserves the viewport span, clamps the start to chromosome bounds, and submits the resulting region through `setRegion`. A finite, nonzero pan fraction rounds to the nearest whole-base shift with a minimum magnitude of one base.

  Availability is intentionally coarse rather than an exact preview of mutation results. Pan disables at the chromosome edge in its declared direction, zoom-in disables at a one-base span, and zoom-out disables when the region spans the chromosome. Invalid declarations, invalid region state, and a consumer-supplied `disabled` value also disable the button. A valid factor close to one may remain enabled even if integer rounding makes activation a no-op.

  Every button has a concise generated accessible name based only on direction: `Pan left`, `Pan right`, `Zoom in`, or `Zoom out`. An explicit consumer-provided accessible name takes precedence. The component does not format action magnitudes for accessible names.

  Public UI documentation describes the action factor conventions, explicit store binding, UI-owned pan behavior, composition responsibilities, coarse disabled behavior, and accessible-name override. No new core navigation API or core documentation is required.

  Verification covers signed pan calculations, rounding, minimum one-base movement, viewport-span preservation, chromosome-boundary clamping, delegation through the latest store's `setRegion` or `zoom`, store replacement, coarse and consumer-supplied disabling, invalid declarations, concise generated names and explicit overrides, native button behavior, narrow subscriptions, public exports, repository-owned consumer migrations, and representative wide and narrow compositions. Tests do not require exact no-op prediction for valid near-one factors or changes to existing core zoom behavior.
