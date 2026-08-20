# Source layout

Each first-party track lives in its own directory. Its `index.ts` defines the module, combines the fetcher, renderer, settings, and tooltip, and exports the module and public types. Keep the implementation files beside that index, and map the index to the package subpath in Vite.

Shared code is organized by feature under `src/shared/{coordinates,layout,settings,signal,tooltips}`. Feature indexes keep internal track imports focused. `src/shared/index.ts` explicitly re-exports the public names through the package's only shared subpath, `/shared`.
