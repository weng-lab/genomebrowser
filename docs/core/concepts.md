# Runtime concepts

This page orients maintainers to `@weng-lab/genomebrowser`: what the package owns, how state and work move through it, and where to debug a problem.

## Purpose and boundaries

The core package is a React genome-browser runtime. It coordinates a genomic viewport, a validated list of tracks, regional data requests, SVG rendering, and browser-level interactions. It intentionally does not provide the larger catalog and application UI; `@weng-lab/genomebrowser-ui` builds those workflows on the runtime track store.

The browser stays generic. Track modules own behavior specific to one track type: config validation, fetching, renderers, display modes, and optional settings and tooltip components. Stable behavior belongs on a module; values and callbacks that vary per track belong on its instance.

Dependencies should point inward toward narrow contracts:

- `src/modules` owns track contracts, schemas, registry behavior, and module-author utilities. It must not depend on `src/browser`.
- `src/browser` owns orchestration and browser features. Each feature keeps its providers, stores, hooks, and DOM/SVG details together and exposes a narrow API.
- `src/tracks` owns first-party modules. They use the same module contract as downstream modules and may use focused browser feature hooks, but not browser orchestration or feature-private files.

## State ownership and lifetimes

There are three important lifetimes:

- Application lifetime: the browser and track store hooks are created by the application and passed to `GenomeBrowser`. They survive React renders and can be shared with other UI.
- Browser instance lifetime: `GenomeBrowser` creates its data, context-menu, and default settings stores once for that mounted browser. An application may supply a settings store override.
- Track-type lifetime: registered module objects hold stable behavior for a type. Track instances hold `{ type, base, config, interaction? }` and may be added, reordered, updated, or removed.

The browser store owns the visible region, width and typography values, zoom, and highlights. The track store owns the registry, validated track instances, and order. `track.base` contains browser-owned identity and presentation fields, `track.config` contains module-owned instance values, and `track.interaction` contains optional app callbacks. Runtime context is derived from the current `{ type, base, config }`; it is not another stored state object.

Store factories return Zustand hooks. Keep application-created stores stable rather than constructing them during component render.

## Request and render flow

For each browser render:

1. `GenomeBrowser` reads the visible region and dimensions from the browser store and tracks plus registry from the track store.
2. `useRenderWindow` expands the visible region to a three-viewport render region and computes the corresponding SVG width.
3. `useTrackData` resolves each track's registered module and calls its `fetch({ config, region })` when required.
4. Fetch functions return raw data for that genomic region. Display- and width-specific shaping belongs in renderers.
5. `TrackStack` selects `module.render[track.base.display]` and supplies the data, render region, dimensions, color, and config.
6. `TrackContent` derives a shallow read-only runtime context from the current validated instance. It binds that context to application callbacks while keeping renderer-facing `useInteraction` handlers item-only.
7. `useTooltip` resolves the current module from that context and gives its tooltip component the semantic item plus the same context.
8. Browser-owned wrappers provide panning, controls, loading and error states, settings, highlights, interaction gating, and tooltip positioning.

An initial render or render-region change fetches every track. A config-only mutation fetches a track only when the value of a field marked by `fetchOnChange` changes. Base fields, interaction callbacks, and unmarked config fields do not cause a request. Failed requests become per-track error states rather than escaping from the browser render.

Later validated base or config mutations appear in later callback events and tooltip renders because context is derived at the rendering boundary. It contains only core runtime `type`, `base`, and `config`; TrackSelect catalog metadata remains catalog-owned and must be combined separately by the UI package or its host.

## Panning and settlement

Panning separates the visible viewport from the larger render window. During drag, the browser moves existing SVG content directly instead of committing a new visible region for every pointer event. The overscanned data usually covers nearby movement.

When a pan commits, the browser targets a new overscanned region. Previously successful data remains visible while requests are in flight. The displayed render region and content offset update only when data for the latest render signature settles; stale async completion cannot settle a newer target. Panning commits and pointer interactions are blocked while the browser is locked or fetching so callbacks do not run against mismatched visual state.

## Feature ownership

Put new behavior in the narrowest owner:

- viewport movement, selection, and zoom coordination: `src/browser/viewport`
- request coordination and request state: `src/browser/data`
- track layout, controls, swapping, and automatic height: `src/browser/track-row`
- tooltip behavior: `src/browser/tooltip`
- browser and track state: `src/browser/state`
- settings and overlays: `src/browser/settings` and `src/browser/overlays`
- contracts shared by browser and tracks: `src/modules`
- type-specific data and presentation: `src/tracks/<type>`

Do not give a track access to a broad browser context to solve one feature. Add a focused API to the feature that owns the capability, as `useTooltip` and `useAutoTrackHeight` do.

## Directory and debugging map

Start from the symptom:

- invalid creation or mutation: `src/modules/defineTrackModule.ts`, `src/modules/registry.ts`, `src/browser/state/trackStore.ts`, and `test/stores/trackStore.test.ts`
- unexpected request or no request after config changes: `src/modules/fetchOnChange.ts`, `src/browser/data/useTrackData.ts`, and `test/data/fetchOnChange.test.ts`
- network or parser failure: the module's `src/tracks/<type>/fetch.ts` and `src/browser/data/fetchTrackData.ts`
- wrong renderer or settings UI: the module definition plus `src/browser/track-row` or `src/browser/settings`
- pan offset, stale region, or interaction lock: `src/browser/viewport`, `src/browser/GenomeBrowser.tsx`, and viewport tests
- tooltip, highlight, or context-menu behavior: the matching feature directory under `src/browser`

For browser-only failures that require console output, inspect `.devserve/out.log` and `.devserve/err.log`. See [Tracks and track modules](tracks.md), [SCREEN GraphQL data fetching](dataFetching.md), [Schema validation](validation.md), [Module-author helpers](helpers.md), and [Testing guidelines](testing.md) for focused guidance.
