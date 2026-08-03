# Troubleshooting

## `No track module registered for type`

The track's `type` is absent from `createTrackStore({ modules })`. Register the same module before creating initial tracks, adding a track, or passing the store to collection UI. Module `type` values must also be unique.

## Validation errors or duplicate IDs

Create tracks with `module.create(...)` rather than assembling the nested runtime object by hand. IDs must be non-empty and unique within the store, display must name one of the module's renderers, height must be positive, and config must pass the module's strict Zod schema.

Initial construction throws because no valid store can be returned. After construction, track-store mutations return `{ ok: false, error }` and leave all state unchanged. Check the return value from `addTrack`, `removeTrack`, `applyTrackChanges`, `reorderTracks`, `updateBase`, `updateConfig`, and `updateInteraction`.

## A browser region is rejected or clamped

Confirm that `createBrowserStore` received an `assembly` and an object region. Browser stores do not accept region strings; use `parseRegion` explicitly, then pass its object result to `setRegion`.

Chromosome names must exactly match a case-sensitive key in `assembly.chromosomes`. Coordinates must be safe integers with `start < end`. Partial overlap with `[0, chromosomeLength)` succeeds with `clamped: true`; a region entirely before or after the chromosome returns `OUTSIDE_CHROMOSOME` without changing state. Unknown chromosomes and malformed, reversed, or zero-width regions likewise return coded failures at runtime.

`parseRegion` only checks the text structure. It preserves chromosome case and does not validate membership, ordering, bounds, or perform clamping, so a successful parse can still produce a rejected `setRegion` result.

## Config changes but data does not refetch

For custom modules, wrap every config schema field that changes the fetched response with `fetchOnChange`. A region change always requests all tracks, but a config-only change requests a track only when its marked-field signature changes.

Do not mark visual-only fields. They should re-render with existing data. If a built-in module does not refetch after changing a documented data-source field, verify that the mutation succeeded before investigating request behavior.

## Network or data failure

Fetch failures appear in the affected track's error state. Check browser network tools for status, CORS, authentication, and response-shape errors. Confirm the URL points to the format expected by the selected module; `YOUR_URL_HERE` in examples is only a placeholder.

For Transcript failures, confirm the host implements the default `/api/screen-graphql` route or that the track's `config.endpoint` names the intended alternative. The module does not construct an authorization header. If the upstream service requires a credential, point the track at an application-owned server proxy and verify that the proxy adds the credential server-side.

## Custom renderer or tooltip failure

An unexpected error while React renders a custom track renderer is contained to that track's content area. An error from custom tooltip content is replaced by `Tooltip unavailable`; hide the tooltip or show one from another track to clear that fallback. Other tracks and browser controls remain available in both cases.

Inspect the original error and React component stack in the browser console. Contained track failures use the `[genomebrowser] Track render error` prefix, and contained tooltip failures use `[genomebrowser] Tooltip render error`.

## Browser is blank, clipped, or too wide

The browser does not measure its parent. Set `trackWidth` to a positive value and update it from a `ResizeObserver` when the container changes. The complete SVG width is `marginWidth + trackWidth`, so subtract the margin from the measured host width if the browser should fit exactly.

Also ensure the host has a real layout width and decide whether narrow containers should resize the browser or allow horizontal scrolling.

## State resets on React renders

Store factories return Zustand hooks. Create them outside ordinary component render or once in a stable initialization boundary. Recreating a browser store resets region and highlights; recreating a track store resets tracks, order, and registry identity; remounting `GenomeBrowser` discards its internal request and overlay state.

## A method threw instead of returning a result

Construction and parsing throw when no valid value can be produced: module definition and creation, registry creation, browser-store creation, track-store creation, `parseRegion`, and invalid highlights.

After browser-store construction, `setRegion`, `zoom`, and `setTrackWidth` use result objects for expected runtime failures and preserve state on failure. Track-store mutations do the same. Catch errors where dynamic input enters construction or parsing; branch on `result.ok` for runtime mutations.

## Client-runtime requirements

Use the package in a React 19.2+ client environment with `react` and `react-dom` installed. Rendering and interaction depend on browser SVG/DOM APIs, pointer events, and network access. Responsive examples additionally use `ResizeObserver`. In SSR frameworks, render the browser from a client-only boundary rather than expecting server-side SVG output.
