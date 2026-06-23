# v2 Cleanup

v2's reason to exist is the **track module system**: tracks are self-contained modules (config + create + validate + fetch + render + optional settings/tooltip) dropped into a generic browser shell. The shell owns stacking, swapping, panning, centralized data fetching, and rendering via `module.render[display]`. Browser-backed capabilities (tooltip, auto-height) are exposed as hooks modules opt into inside the browser context (ADR 0006).

v2 regressed by innovating on **plumbing** (pan/swap/render-window) instead of reusing core's proven approach: `react-draggable` + a single `delta` number in the store + settle-inside-the-fetch-effect. v2's four viewport hooks, manual `setAttribute` transforms, and `registerContentGroup` ref-sets reimplemented what core solved with less code — and introduced an FPS bug where pan commit + settle trigger back-to-back full re-renders of unmemoized renderers over overscanned data.

The cleanup cements the module thesis (architecture) and adopts core's plumbing under v2's architecture (factored stores, context, registry, validation). The browser is a generic shell; the module is the product.

## Guiding principles

- **Don't default to `memo`/`useMemo`/`useCallback`.** If we need them to avoid re-renders, the orchestration is wrong. Fix the state machine, don't paper over it.
- **Don't add module slots preemptively.** The contract stays minimal until a real track asks for more (no `renderLoading`/`renderError` — shell owns loading/error chrome).
- **Browser-backed hooks are the only browser knowledge tracks have.** Catalog is exactly `{useTooltip, useAutoTrackHeight}`. Everything else tracks need comes from their module or config.
- **ADR 0006 is the bar.** Browser features are deep modules that own their state and expose narrow APIs. No prop-drill wrapped in a Provider costume.

## Decisions already locked

- `react-draggable` for both pan (horizontal `DragTrack`) and swap (vertical `SwapTrack`) — proven on SVG in core.
- `delta` is a single number on `browserStore`. Pan commit calls `shiftRegion()`. Settle is `setDelta(0)` + `setFetching(false)` at the end of the fetch effect — not a React callback.
- Render region swaps when `isFetching` goes false (port of core's `useXTransform`).
- `TrackRow` splits into `DisplayTrack` (data + module resolution) + `TrackWrapper` (chrome) + `SwapTrack` + `DragTrack` — core's wrapper layering, reading from context/store.
- `registry` goes in React context — premier prop of `GenomeBrowser` alongside `browserStore`, `trackStore`, `settingsStore`. Not attached to the track store.
- Module contract stays as-is: `{type, create, validate, fetch, render, settingsComponent?, tooltipComponent?}` + config-level `onClick/onHover/onLeave`.
- Stores are factory-created outside the browser so they can drive other UI too.

## Phase 0 — Investigate (before touching code)

### T0a — Audit `isPanning` vs `isInteractionBlocked` consumers
- **Problem:** `isPanning` (currently `panDrag.isDragging`) is consumed only by `TooltipProvider` (`disabled={isPanning}`). `isInteractionBlocked` (`isPanLocked || isFetching`) is consumed by 6 places: `SelectRegion`, `TrackRows`/`TrackRow` (as `isPanLocked`), `InteractionShield`, `useTrackSwap`, `TrackControls`, `ContextMenuController`, `SettingsModalController`, `useTrackMutationGate`.
- **Work:** Determine whether `isPanning` can be derived from `delta !== 0` (true during drag AND settle — likely sufficient for tooltip suppression). Determine whether `isInteractionBlocked` becomes `isFetching || delta !== 0` derived from stores. Map every consumer to its new source.
- **Acceptance:** A written mapping of each consumer → where it reads the gate from after cleanup. No more drilled `isPanLocked`/`isPanning` props.

### T0b — Decide swap reorder API
- **Problem:** Core used `shiftTracks(id, index)`; v2's `trackStore` has `reorderTracks(ids)`. `SwapTrack` needs to move a track to a target index on drop.
- **Work:** Either (a) add `moveTrack(id, toIndex)` to `trackStore` (cleaner `SwapTrack`), or (b) have `SwapTrack` compute the new ids array and call existing `reorderTracks`.
- **Acceptance:** One approach chosen with rationale. `SwapTrack` stays dumb (no index math in the component if (a)).

## Phase 1 — Cement the module thesis (architecture, no behavior change)

### T1 — Cement module contract
- **Problem:** `src_new/modules.ts` (killed) proved a minimal `TrackModule` shape works; the live `src/modules/types.ts` shape is the right one but was never declared as the stable contract.
- **Work:** Declare `{type, create, validate, fetch, render, settingsComponent?, tooltipComponent?}` + `TrackConfigBase` interaction slots as THE contract. Do NOT add `renderLoading`/`renderError` — shell owns loading/error. If a module wants custom loading later, add the slot then.
- **Acceptance:** `modules/types.ts` documented as the contract; no fields added or removed.
- **ADRs:** 0001, 0007.

### T2 — Cement browser-backed hook catalog
- **Problem:** Tracks consume exactly two browser-backed hooks today: `useTooltip`, `useAutoTrackHeight` (verified across all 5 track modules). `useSvgPoint` is internal to `useTooltip`, not part of the catalog.
- **Work:** Ensure `lib.ts` exports only these two as track-facing browser hooks. Demote `useSvgPoint` to internal.
- **Acceptance:** Track-facing hook surface = `{useTooltip, useAutoTrackHeight}`. Nothing else.
- **ADRs:** 0006.

### T3 — Put `registry` in React context
- **Problem:** Registry is a `useMemo` in `GenomeBrowser`, then prop-drilled through `BrowserFeatureProviders` → `TooltipProvider`, and passed to `TrackRows`/`TrackRow`/`ContextMenuController`/`SettingsModalController`. The drill is the leak ADR 0006 forbids.
- **Work:** Create `RegistryContext`/`RegistryProvider`. `GenomeBrowser` takes `modules` (premier prop alongside the stores), builds the registry, provides it. Consumers (`DisplayTrack`, `ContextMenuController`, `SettingsModalController`, `TooltipProvider`) read via `useRegistry()`.
- **Acceptance:** No `registry` prop drilling below `GenomeBrowser`. `BrowserFeatureProviders` no longer takes `registry`.
- **ADRs:** 0006.

### T4 — Fix provider prop-drill
- **Problem:** `BrowserFeatureProviders` takes `svg`, `registry`, `isPanning`, `getTrackHeight`, `updateTrack` as props and re-provides them. Providers don't own their dependencies — they're prop-drills in Provider costume. Violates ADR 0006.
- **Work:**
  - `TooltipProvider`: read registry from `useRegistry()` (after T3); read `isPanning`/gate from store or derived value (after T0a). Remove `registry`/`isPanning` props.
  - `TrackHeightProvider`: read `getTrackHeight`/`updateTrack` from `useTrackStore` directly. Remove those props.
  - `BrowserSvgProvider`: `svg` stays a prop (DOM ref owned by `GenomeBrowser`/`SvgShell`) — this one is legit.
  - `BrowserFeatureProviders` collapses to a thin composition line.
- **Acceptance:** Providers read their own dependencies from context/store. `BrowserFeatureProviders` takes only `children` + `svg`.
- **ADRs:** 0006.

### T5 — Delete duplicate `useBrowserSvg`
- **Problem:** Two `useBrowserSvg` implementations exist: `browser-state/BrowserContext.tsx` (reads `context.svg`) and `browser-svg/useBrowserSvg.ts` (reads `BrowserSvgContext`). `useSvgPoint`/tooltip read the second; others read the first. If they ever disagree, undiagnosable bug.
- **Work:** Keep `browser-svg/useBrowserSvg.ts` as the single source. Remove `svg` from `BrowserContextValue` and `useBrowserSvg` from `BrowserContext.tsx`. Update all consumers to import from `browser-svg/`.
- **Acceptance:** One `useBrowserSvg`. `svg` lives only in `BrowserSvgContext`.

## Phase 2 — Rebuild plumbing (fixes FPS bug + seam collapse)

### T6 — Add pan/render-window state to `browserStore`
- **Problem:** Pan state is split across `useContentTransform` (delta ref + `setAttribute`), `usePanController` (lock + commit), `usePanDrag` (pointer handling), `useRenderWindow` (overscan). Core kept all this as `{delta, multiplier, setDelta, shiftRegion, getExpandedRegion}` on the store.
- **Work:** Add to `browserStore`: `delta: number`, `multiplier: number` (default 3, from `PAN_OVERSCAN_MULTIPLIER` const), `setDelta`, `shiftRegion` (port of core's `shiftDomain`: `start -= floor(delta/trackWidth * span)`, `setRegion`), `getExpandedRegion` (port of core's `getExpandedDomain`: region ± `(multiplier-1)/2 * span`). Add `multiplier` to `BrowserStoreInput`.
- **Acceptance:** `browserStore` owns pan offset + overscan math. No viewport hook needed for these.
- **Files:** `src/browser/browser-state/browserStore.ts`.

### T7 — Add `isFetching` to `dataStore`
- **Problem:** `useTrackData` tracks fetching in local React state (`fetchingTrackIds` Set). That forces settle to bounce through a React callback — the FPS bug's enabler. ADR 0005 calls for a focused `isFetching` boolean on the module/store.
- **Work:** Add `isFetching: boolean` + `setFetching` to `dataStore`. Replace `useTrackData`'s local `fetchingTrackIds` with it.
- **Acceptance:** `isFetching` is a store value any component can read. ADR 0005's "compose `isFetching` into settled gate" has a real boolean.
- **Files:** `src/browser/track-data/dataStore.ts`, `src/browser/track-data/types.ts`.

### T8 — Add `moveTrack` to `trackStore` (if T0b chose (a))
- **Work:** Add `moveTrack(id, toIndex)` action. Implement via array splice + `set({tracks, order})`.
- **Acceptance:** `SwapTrack` calls `moveTrack(id, closestIndex)` on drop.
- **Files:** `src/browser/track-state/trackStore.ts`.
- **Depends on:** T0b.

### T9 — Port `DragTrack` (horizontal pan)
- **Problem:** v2's hand-rolled pan (`usePanDrag` + `useContentTransform` manual `setAttribute`) is 188 lines and causes the double-render FPS bug. Core's `DragTrack` is 63 lines and uses `react-draggable`.
- **Work:** Port core's `dragTrack.tsx`: `<Draggable axis="x" position={{x:delta,y:0}}>`, `onDrag` writes `setDelta(delta + d.deltaX)`, `onStop` either `setDelta(0)` (below 10px threshold) or `shiftRegion()`. `canDrag = delta !== 0 ? () => false : () => {}` blocks pan during settle. Reads `delta`/`setDelta`/`shiftRegion` from `browserStore` via hook.
- **Acceptance:** Pan works via `react-draggable`. No manual `setAttribute`. No `useContentTransform`, no `registerContentGroup`.
- **Files:** new `src/browser/track-row/DragTrack.tsx` (or `src/browser/wrappers/`).

### T10 — Port `SwapTrack` (vertical reorder)
- **Problem:** v2's swap (`track-swap/`) is a separate subsystem with its own math. Core's `SwapTrack` is 113 lines, uses `react-draggable` `axis="y"`, portal clone, `shiftTracks` on drop.
- **Work:** Port core's `swapTrack.tsx`: `axis="y"`, `handle=".swap-handle"` on the margin, portal clone while dragging, `moveTrack(id, closestIndex)` (or `reorderTracks`) on drop. Reads `shiftTracks`/`getTrackIndex`/layout from stores via hooks.
- **Acceptance:** Swap works via `react-draggable`. Old `src/browser/track-swap/` deleted or slimmed to shared math only.
- **Files:** new `src/browser/track-row/SwapTrack.tsx`; delete/trim `src/browser/track-swap/`.

### T11 — Split `TrackRow` into `DisplayTrack` + `TrackWrapper`
- **Problem:** `TrackRow` is 254 lines, 18 props, owns chrome + clipping + hover + context menu + color strip + controls + pan surface + swap variants + module resolution. ADR 0006's widest violation. `issues.md` (v2) already flagged this.
- **Work:**
  - `DisplayTrack` (was `TrackRowContent`): reads `track` from `useTrackStore`, `dataState` from `useDataStore`, `renderRegion` from `useRenderRegion` (T13), registry from `useRegistry()` (T3). Resolves `module.render[display]`. Owns loading/error state (passes loading/error elements as children to `TrackWrapper`). ~30 lines.
  - `TrackWrapper` (was `TrackRow` chrome half): reads layout + context-menu from stores. Renders title, color strip, hover rect, context-menu rect, controls, loading/error overlays. Wraps children in `SwapTrack` → `DragTrack`. ~40 lines.
  - Delete `src/browser/track-row/TrackRow.tsx`.
- **Acceptance:** No component takes 18 props. `TrackWrapper` takes `{id, y, children}`. `DisplayTrack` takes `{id, y}`. Chrome and data concerns are separate.
- **ADRs:** 0006.

### T12 — Simplify `TrackRows`
- **Problem:** `TrackRows` is 93 lines drilling 10+ props into each `TrackRow`.
- **Work:** Reduce to ~10 lines: map `tracks` from `useTrackStore`, compute Y, render `<DisplayTrack id={track.id} y={trackY}/>`. No pan/render-window/registry props.
- **Acceptance:** `TrackRows` is a flat map. Zero prop-drill.
- **Files:** `src/browser/track-row/TrackRows.tsx`.

### T13 — `useRenderRegion` hook
- **Problem:** `useRenderWindow` (65 lines) manages `displayedRenderRegion` + `settleData` + `dataKey` to swap the displayed region when data settles — via a React callback. Core's `useXTransform` does this in 8 lines by reading `isFetching`.
- **Work:** Port core's `useXTransform` region logic: `useState(getExpandedRegion())`, `useEffect` swaps to `getExpandedRegion()` when `isFetching` goes false. Reads `isFetching` from `dataStore`, `getExpandedRegion` from `browserStore`.
- **Acceptance:** Renderers read a stable region that swaps once when fetching completes. No `settleData`/`dataKey`/`displayedRenderRegion` plumbing.
- **Files:** new `src/browser/viewport/useRenderRegion.ts`.

### T14 — Rewrite `useTrackData` fetch effect (settle in effect)
- **Problem:** Settle currently fires `onSettled` callback → `handleDataSettled(dataKey)` → `settleData` + `setContentOffset(0)` + `unlockPan` → second full re-render. Core's `useDataFetcher` does settle as 2 lines at the end of the effect.
- **Work:** Rewrite to core's shape: guard on `isFetching`/tracks, `setFetching(true)`, fetch all in parallel, `.then(() => { setData(...); setFetching(false); setDelta(0); })`. Delete `onSettled`, `handleDataSettled`, `settleData`, `dataKey`, `previousRegionKey`/`previousFetchKeys` machinery.
- **Acceptance:** Settle is 2 lines inside the effect. No React callback triggers a second render. This is the FPS fix.
- **Files:** `src/browser/track-data/useTrackData.ts`.

### T15 — Delete dead viewport hooks
- **Work:** Delete `useContentTransform.ts`, `usePanController.ts`, `usePanDrag.ts`, `useRenderWindow.ts`. Remove `PAN_OVERSCAN_MULTIPLIER` const from `GenomeBrowser.tsx` (now `multiplier` on store).
- **Acceptance:** ~330 lines of viewport plumbing removed. Replaced by T6 (store) + T9 (`DragTrack`) + T13 (`useRenderRegion`).
- **Depends on:** T6, T9, T13, T14.

### T16 — Slim `GenomeBrowser` orchestration
- **Problem:** `GenomeBrowser` coordinates `contentX`/`contentWidth`/`registerContentGroup`/`panDrag`/`isPanLocked` and passes them through `TrackRows` → `TrackRow`. It also computes `isInteractionBlocked` and drills it.
- **Work:** Remove the pan/render-window prop chain (now in stores + wrappers). `GenomeBrowser` provides `BrowserProvider` + `RegistryProvider` + `BrowserFeatureProviders` + `SvgShell` + `TrackRows`. `isInteractionBlocked` derived from stores (T0a), not computed and drilled.
- **Acceptance:** `GenomeBrowser` is orchestration only: ~80 lines, no pan/render-window coordination.
- **Depends on:** T3, T4, T11, T12, T15.

### T17 — `InteractionShield` + gate consumers read from stores
- **Problem:** `InteractionShield` takes `active` as a drilled prop. `SelectRegion` takes `disabled` as a drilled prop. `useTrackMutationGate` reads from context.
- **Work:** All gate consumers derive `isInteractionBlocked` from `useDataStore(s => s.isFetching) || useBrowserStore(s => s.delta !== 0)` (per T0a mapping). Remove drilled `active`/`disabled`/`isPanLocked` props.
- **Acceptance:** No gate flag is prop-drilled. Every consumer reads from stores/context.
- **Depends on:** T0a, T6, T7.

### T18 — Add `react-draggable` dependency
- **Work:** Add `react-draggable` to `packages/v2/package.json` dependencies.
- **Acceptance:** Dependency present; `DragTrack`/`SwapTrack` import it.
- **Depends on:** T9, T10.

## Phase 3 — Surface

### T19 — Split `lib.ts` into `browser` + `modules` entry points
- **Problem:** `lib.ts` exports ~40 flat symbols — stores, context, settings, context-menu, fetch fns, render components, hooks, types — with no seam between browser consumer and module author.
- **Work:** Split into two entry points: `browser` (stores, context, `GenomeBrowser`, consumer hooks) and `modules` (`defineTrackModule`, types, `SettingsSection`, `fetchOnChange`). Update `package.json` `exports` map.
- **Acceptance:** Two narrow surfaces replace one flat 40-symbol dump. Module authors import from `modules`; browser consumers import from `browser`.
- **Note:** Decide whether this is a breaking change for existing consumers or additive (re-export from root for compat).

## Phase 4 — Later / deferred

### T20 — Revisit `TrackModule` shape after seams are clean
- **Problem:** `TrackModule` carries `validate` + `tooltipComponent` + config-level `onClick/onHover/onLeave`. After T1–T19 the seams are clean enough to judge whether these belong on the module, on the config, or elsewhere.
- **Work:** Audit each slot against the "module owns behavior, config owns instance" thesis (ADR 0007). Don't touch until Phase 1–3 land.
- **Acceptance:** Each slot justified or moved. No premature cuts.
- **ADRs:** 0001, 0007.
- **Depends on:** All of Phase 1–3.

## Dependency order (rough)

```
T0a, T0b                          (investigate first)
  ↓
T1, T2                            (cement contract — no code)
T3 → T4 → T5                      (registry context, providers, dedupe)
  ↓
T6, T7, T8                        (store state for pan/fetch/swap)
T9, T10, T11, T12, T13, T14       (wrappers + hooks + fetch effect)
T15 (after T6,T9,T13,T14)         (delete dead code)
T16 (after T3,T4,T11,T12,T15)     (slim GenomeBrowser)
T17 (after T0a,T6,T7)             (gate from stores)
T18 (with T9,T10)                 (dependency)
  ↓
T19                               (split lib.ts)
  ↓
T20                               (deferred — revisit module shape)
```

Phases 1 and 2 are the work. Phase 3 is taste. Phase 4 is "later, when it's clean enough to judge."
