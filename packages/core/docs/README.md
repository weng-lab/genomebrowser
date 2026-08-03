# @weng-lab/genomebrowser

`@weng-lab/genomebrowser` is a React runtime for displaying genomic tracks. It provides the browser viewport, validated Zustand stores, first-party track modules, and an extension API for custom track types.

Install the package with its React peer dependencies:

```sh
pnpm add @weng-lab/genomebrowser@alpha react@^19.2 react-dom@^19.2
```

The package is intended for client-side React 19.2+ applications. Its browser uses SVG, pointer events, `ResizeObserver` in responsive integrations, and remote data requests. It is not a server-rendered visualization runtime.

## Runtime and optional UI

`@weng-lab/genomebrowser` renders and manages the browser itself. `@weng-lab/genomebrowser-ui@alpha` is a separate optional package for higher-level application UI such as collection-backed track selection. Both can share the same track store; installing the UI package is not required to render a browser.

## Recommended API

Most applications need a small surface:

- `createBrowserStore` for region, dimensions, zoom, and highlights
- `createTrackStore` for registered modules and validated track instances
- one or more built-in modules, such as `bigWigModule`
- `GenomeBrowser` to render those stores

Create the stores once, outside ordinary component render, and pass the same track store to any companion UI. Module authors additionally use `defineTrackModule`, `fetchOnChange`, focused renderer hooks, and exported module types. Internal package paths are not public API.

## Learning path

- [Getting started](gettingStarted.md): install, create stable stores, render responsively, and update state.
- [Core concepts](concepts.md): state ownership, request behavior, and interaction lifetimes.
- [Recipes](recipes.md): common track, navigation, highlight, sizing, and optional UI tasks.
- [Tracks](tracks.md): the concise current built-in module inventory.
- [Custom track modules](customTrackModules.md): add a validated fetch/render type.
- [Troubleshooting](troubleshooting.md): diagnose setup, validation, request, and sizing failures.

These docs ship with the package and are self-contained.
