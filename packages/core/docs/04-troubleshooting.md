# Troubleshooting

Check the section matching the symptom. For rejected updates, inspect the action's result. For request failures, use the browser's network tools. Renderer and tooltip errors appear in the console.

## The browser is blank or too wide

A responsive browser waits for its first positive container measurement before drawing tracks or requesting their data. If no rows appear, inspect the containing layout and confirm that it has an available width. In flex or grid layouts, `min-width: 0` allows the item containing the browser to shrink within that space.

With fixed sizing, the drawing width comes from `marginWidth + trackWidth`, multiplied by `scale`. A drawing wider than its container scrolls horizontally. `setTrackWidth` affects this fixed mode; responsive views use their own measurements instead. A large scale also enlarges the gutter, so even a responsive view can overflow a container narrower than its minimum drawing area.

The [first browser example](01-gettingStarted/01-firstBrowser.md) shows the responsive wrapper. The [sizing reference](03-reference/01-browserSetup/GenomeBrowser.md) covers fixed dimensions and magnification.

## The ruler appears but the data track is empty

A coordinate ruler does not establish whether the data source covers the visible region. Confirm that the URL placeholder has been replaced, that the file uses the same assembly, and that the current chromosome and region contain records. Chromosome names must match the data source exactly, including case and any `chr` prefix.

An empty successful result is different from a failed request. If the row displays an error, inspect the response status and body in browser network tools. The URL must serve the expected file format rather than a download page or authentication response. A cross-origin source must permit the application to read it; indexed file readers also depend on the server supporting the required byte-range requests.

## A module type is not registered

`No track module registered for type` means an instance's `type` is absent from the track store's registry. Creating an instance through a module does not register that module automatically. Include it in `createTrackStore({ modules })` before using its tracks as initial state, adding them through actions, or loading them from a collection.

Each registry needs unique module type names. Keep the module array shared between the store and collection validation so the catalog is checked against the types the browser can actually render.

## A track update is rejected

Track mutations validate the complete resulting instance before committing. A missing track ID, unsupported display, invalid config, or duplicate ID can therefore reject an otherwise small edit. Inspect `result.ok` and display `result.error` at the control that attempted the change. A rejected mutation leaves the previous store state intact.

Creation and updates use different shapes. Create an instance with `module.create({ base, config })`; patch it with `updateTrack(id, { base, config })`. Patches merge top-level base and config fields, while nested values are replaced. A new `yRange: { min: 0 }`, for example, does not retain an old nested `max` automatically.

Settings-dialog callbacks can also return `INTERACTION_BLOCKED` while browser interactions are disabled. Treat that as a rejected edit rather than assuming it was queued. The [track-store reference](03-reference/01-browserSetup/trackStore.md) lists mutation results and patch behavior.

## A region is rejected or clipped

The browser store validates regions against its assembly. Coordinates must be safe integers with `start < end`, and the chromosome must match a key in `assembly.chromosomes`. A region partly overlapping a chromosome is accepted with `clamped: true`; a region entirely outside it is rejected.

For text input, `parseRegion` handles syntax and produces an object, then `setRegion` checks that object against the assembly. A successful parse does not prove that the chromosome exists or the region is valid. Both use zero-based, half-open coordinates, and parsing does not subtract one from the start. [Navigate to a region](01-gettingStarted/03-navigationAndSelection.md#navigate-to-a-region) explains how parsing and navigation work together.

## Configuration changes without another request

First confirm that the track mutation succeeded. For custom modules, the next question is whether the changed value affects fetching or fetch-time processing. Such fields need `fetchOnChange` markers in the config schema; fields used only for rendering can remain unmarked.

Markers compare parsed values, so supplying an equivalent marked value does not force a new request. Changes to the display or render demand also trigger requests. Width-only changes wait briefly for resizing to stop. [Data fetching and rendering](02-guides/dataFetching.md) explains which configuration fields need markers.

## Custom features move or stretch during panning

Renderers receive both a visible viewport and a render region containing extra data for panning. Horizontal positions must use the supplied `region` and `width` together. Mixing `visibleRegion` with the full render width changes the genomic scale and can shift features when core moves the SVG content.

The fetcher must likewise read `demand.region`, not a separate application store's visible region. Keeping the fetch and drawing coordinates aligned allows core to retain compatible data during a same-scale pan. The [renderer reference](03-reference/04-rendererIntegration/trackRenderer.md) describes both coordinate spaces.

## Track clicks or tooltips stop responding

Zoom and highlight modes use a selection overlay across the data area. It handles drags instead of forwarding normal track hover, clicks, or context menus. Switch to pan mode to restore those interactions. Core also blocks interactions during loading or while the displayed data no longer matches its position on screen.

For a custom renderer, check that its SVG elements actually call `useInteraction` handlers and that the module provides tooltip content for `useTooltip`. The hooks do not attach DOM events automatically. A registered callback only runs when the renderer emits the corresponding item event.

## A state readout does not update

`getState()` reads the current store without creating a React subscription. A component that renders `getState().region` may therefore stay unchanged until something else rerenders it. Select the displayed value with `useBrowserStore((state) => state.region)` so region changes update the readout directly.

Selecting a stable action or lookup function also does not subscribe to the values it accesses. To display a track title, select `state.getTrack(id)?.base.title` rather than selecting `state.getTrack` and calling it during rendering. Select actions separately for event handlers, as shown in [Access browser state and actions](01-gettingStarted/01-firstBrowser.md#access-browser-state-and-actions).

## State resets or two browsers change together

Creating stores in an ordinary component render replaces their state on each render. Create them once at file scope for an application-owned session, or in a lazy `useState` initializer for each independent browser component. File-scoped stores are shared, so two components importing them intentionally see the same region and tracks.

A remounted visualization also recreates its internal request and overlay state, even if its supplied stores survive. This can explain a new fetch without a reset to the application region. [State and browser lifetime](02-guides/stateAndLifetime.md) shows both ownership patterns.

## `useGenomeBrowser` throws outside a browser

The hook resolves context supplied to hosted renderers, settings forms, and tooltips. A toolbar beside `GenomeBrowser` is outside that context and should use the application-owned store directly. Controls or dialogs that need the context can be passed as `GenomeBrowser` children, which render outside the SVG.

For reusable track components, keep the hook inside the hosted component rather than at module-definition time or inside a fetcher. The [context reference](03-reference/01-browserSetup/useGenomeBrowser.md) explains how resolving a store differs from subscribing to it.

## A custom renderer or tooltip fails

If a track renderer throws during React rendering, core shows the error in that track's content area. The console reports the original exception under `[genomebrowser] Track render error`. A failed tooltip shows `Tooltip unavailable` and logs `[genomebrowser] Tooltip render error`; hiding it or showing a tooltip from another track clears that fallback.

Inspect the original exception and component stack before changing request logic. A fetch failure happens before successful data reaches the renderer and shows a data-loading error in the track. Custom event-handler exceptions are also separate from React rendering failures and need handling in application callbacks.

## TrackSelect creates duplicate rows or restores an unexpected selection

Collection tracks use IDs such as `signals::signal`. A directly created row with ID `signal` is a separate non-collection track and is preserved during reconciliation. Remove the directly created track before letting the picker add its collection version.

Initialization runs even with `open={false}`. An explicit empty `initialTrackIds` array selects no catalog tracks, while leaving both initial and default IDs undefined preserves the existing store. Remounting the picker or changing its initialization inputs can apply the initial selection again. Keep the picker mounted and loaded initial IDs stable for the intended session.

`onCommittedTrackIds` saves successful Submit selections only. It does not observe initialization, Cancel, or changes from other controls, and it excludes non-collection tracks. [Use track collections](01-gettingStarted/04-trackCollections.md) explains which selection changes the callback saves.

## An operation throws instead of returning a failure

Construction and parsing throw when they cannot produce a valid value. This includes store creation, module definition and creation, collection validation, and region parsing. Once stores exist, their public mutation actions use result objects for expected input failures. Unexpected exceptions from custom schemas or callbacks can still propagate.

Catch errors when parsing input or constructing stores and tracks. For mutations, check the returned result. The application should not continue as though an instance exists after its creation failed.
