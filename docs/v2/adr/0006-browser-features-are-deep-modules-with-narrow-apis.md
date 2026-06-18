# Browser features are deep modules with narrow APIs

Browser features live under `src/browser/<feature>` as deep modules. A feature owns its providers, stores, hooks, DOM/SVG coordination, and internal components, then exposes only the small entry points needed to wire it into `GenomeBrowser` and, when track modules need to participate, focused track-facing hooks such as `useTooltip` or `useAutoTrackHeight`.

This keeps `GenomeBrowser` as orchestration instead of implementation detail, and it keeps tracks from reaching into browser internals. Tracks may use public feature APIs, but must not import browser orchestration, browser stores, viewport implementation, provider internals, or feature-private files; if a track needs a browser-backed capability, expose that capability from the owning browser feature instead of adding a broad runtime context or leaking implementation details.
