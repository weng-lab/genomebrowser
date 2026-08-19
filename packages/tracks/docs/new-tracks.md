# Source layout

Each first-party track lives in its own directory. Its `index.ts` defines the module, combines the fetcher, renderer, settings, and tooltip, and exports the module and public types. Keep the implementation files beside that index, and map the index to the package subpath in Vite.

Shared settings and tooltip exports use the same directory and `index.ts` pattern.
