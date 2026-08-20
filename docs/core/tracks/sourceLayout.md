# First-party track source layout

Use this layout when adding or changing a module in `packages/tracks`.

Each first-party track lives in its own directory under `packages/tracks/src`. Its `index.ts` defines the module, combines the fetcher, renderer, settings, and tooltip, and exports the module and public types. Keep the implementation files beside that index.

Map each public track entry in both `packages/tracks/vite.config.ts` and the `exports` field of `packages/tracks/package.json`. Add the module to `packages/tracks/src/lib.ts` when it should be part of `firstPartyTrackModules`.

Shared code is grouped by feature under `packages/tracks/src/shared/{coordinates,layout,settings,signal,tooltips}`. Feature indexes keep internal imports focused. `packages/tracks/src/shared/index.ts` explicitly exports the public names through the package's only shared subpath, `/shared`.

User-facing module and configuration documentation belongs in `packages/tracks/docs`. Keep repository paths and maintainer workflow out of those shipped package docs.
