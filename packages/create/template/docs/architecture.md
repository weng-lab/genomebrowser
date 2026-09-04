# Architecture

The page composes browser controls and the genome display. Controls own their local state, such as whether a dialog is open. Shared stores connect navigation, tracks, and rendering.

## Shared state

The app creates one set of stores outside React rendering:

- `useBrowserStore`: assembly, region, dimensions, and highlights.
- `useTrackStore`: registered modules and displayed tracks.
- `useSettingsStore`: the track settings interface.

Controls and the genome display use the same stores. A second independent browser needs its own store instances and controls connected to them. Reloading the page recreates the stores; persistence is not configured.

## Modules and collections

A **module** provides reading and rendering behavior for a track type. A **collection** lists datasets and their configuration. Adding another BigWig dataset requires a collection entry, not another module.

The collection schema is generated from the registered modules. Regenerate it with `npm run schema` after changing module registration. Dataset-only edits do not require regeneration.

## Why the track picker stays on the page

The track store starts empty. `TrackSelect` loads `defaultTrackIds` when mounted, even while its dialog is closed. Those IDs also define the selector's Reset selection.

Keep the selector mounted with `open={false}` when closed. Conditional mounting delays startup tracks until the dialog opens; remounting can reapply the initial selection. Keep the collection array stable to avoid reparsing unchanged configuration.

For API details, use the [installed package documentation](../AGENTS.md#package-documentation).
