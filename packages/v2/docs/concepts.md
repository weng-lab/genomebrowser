# v2 Concepts

These notes describe the current maintainer-facing direction for v2.

## Browser as orchestration

`GenomeBrowser` should mostly orchestrate other pieces. It receives browser state, track state, and registered track modules, then coordinates viewport behavior, data loading, rendering, and other interactions.

The browser should avoid owning track-specific behavior directly. Track-specific data fetching, rendering, validation, and runtime config belong in track modules.

## State and hooks

State and hooks provide focused browser behavior:

- browser state owns the current region and layout values
- track state owns the list of track configs
- viewport hooks handle panning, render windows, and SVG content movement
- data hooks ask track modules to fetch data for the current render region
- utility modules handle shared region, scale, and SVG behavior

The browser composes these pieces instead of making each behavior part of one large component.

## Track modules

Track modules are the main extension point for track types. A module defines how a track config is created and validated, how its data is fetched, and how each display mode renders.

See [Tracks and track modules](tracks.md) for the current module shape and runtime flow.

## Design direction

Keep the core browser generic. When adding behavior, prefer putting it in the narrowest place that owns it:

- browser-level behavior goes in browser hooks or components
- track-specific behavior goes in track modules
- reusable calculations go in utility modules
- shared runtime contracts go in `src/modules`

See [Schema validation](validation.md) for how runtime input is checked at package and module boundaries.
