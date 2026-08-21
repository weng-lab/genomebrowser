# Core Concepts

The v2 package separates application-owned state, track-type behavior, and browser orchestration. Understanding those three roles is enough for most integrations.

## Stores belong to the application

`createBrowserStore` and `createTrackStore` return Zustand hooks that the application creates and keeps stable.

The browser store owns the visible genomic region, track-area width, margin and typography sizes, zoom behavior, and highlights. The track store owns the registered module set, validated track instances, and their order. Because the stores live outside `GenomeBrowser`, application controls and optional UI-package components can use the same state.

`GenomeBrowser` creates short-lived internal state for the mounted browser, including request results and default settings/context-menu state. Unmounting it discards that internal state, but does not discard the application-owned browser or track stores. An application may provide a custom settings store when it needs to replace browser-owned settings UI.

## Assemblies bound every browser region

Every browser store requires an `AssemblyDefinition` and an object `GenomicRegion`. The assembly is immutable configuration for that store: construction validates and snapshots it, and there is no runtime assembly setter or global assembly registry.

The package exports `hg38`, `mm10`, `ce11`, `dm6`, and `tair10`. Each built-in contains canonical nuclear chromosomes plus organelle sequences only. Alternate loci, random sequences, unlocalized scaffolds, and unplaced contigs are not included. Use a custom definition when your data needs other sequence keys.

An `AssemblyDefinition` has a non-empty `id` and a non-empty `chromosomes` record whose values are positive safe-integer sequence lengths. Sequence names are authoritative, exact, and case-sensitive. The core does not infer aliases or attach special behavior to a built-in ID, so a custom definition can use any ID and arbitrary sequence keys.

Core coordinates are zero-based and half-open. `{ chromosome: "chr1", start: 0, end: 1 }` selects the first base, and region width is `end - start`. The assembly definition does not change this convention.

## Track row hover feedback

Hovering the left track margin, including its color strip and track controls, highlights the full track row. The highlight turns off when the pointer leaves that margin. Hovering the centered track title or genomic data area does not activate the row highlight.

## Modules define track types

A registered module holds stable behavior for one type: schemas, defaults, fetching, renderers, display modes, and optional settings and tooltip components. A track instance holds values for one row:

- `type` chooses the module.
- `base` contains ID, title, display, height, and a concrete color.
- `config` contains module-specific values such as URLs and visual options.
- `interaction` optionally contains app callbacks for that instance.

Create tracks through `module.create(...)`, then register that same module in the track store. Track IDs and module types must be unique in their respective collections.

When a renderer emits a semantic item, the browser invokes the stored application callback with that item and a current `TrackRuntimeContext`: `{ type, base, config }`. Module tooltip components receive the same context with their item. `base` and `config` are shallow read-only views, and later validated store mutations appear in later events and tooltip renders. The context is derived runtime state, not a separately persisted object, and it does not contain collection metadata from optional UI packages.

## Exact request behavior

On initial mount, the browser requests every track for an overscanned render region around the visible region. A visible-region change targets a new overscanned region and requests every track again.

For a config-only change, the browser requests only that track and only when a field marked by its module with `fetchOnChange` has changed. Region, SVG width, assembly, and display changes also request data. Other base fields, interaction callbacks, and unmarked config fields re-render without requesting data. Custom module authors must mark every config field that affects either the request or fetch-time processing.

Each module fetch receives shallow read-only track and render-demand snapshots. It may return raw records or data processed for the requested region, display, and SVG width. The selected renderer turns that result into SVG output.

During panning, existing SVG content moves immediately. Previously successful track data stays visible while a region-only request is in flight. A display, SVG width, assembly, or marked config change clears incompatible data while its replacement loads. The browser settles onto the newest render region only after its track requests finish, and it blocks pointer interactions during mismatched or fetching states. A failed request is shown as a track error; other tracks can still complete.

## Mutation behavior

Static construction fails by throwing: invalid assembly or initial-region input, invalid browser dimensions, invalid module input, initial tracks, unknown module types, and duplicate IDs cannot produce a valid object.

After a store exists, expected mutation failures return discriminated results instead. `setRegion` and `zoom` return either `{ ok: true, region, clamped }` or `{ ok: false, code, error }`; `setTrackWidth` returns the committed width on success or a coded error. Track mutations likewise return `{ ok: false, error }` when rejected. Failed mutations are atomic and leave the current region, dimensions, tracks, and order unchanged.

Region normalization accepts only finite safe-integer coordinates with `start < end` on an exact assembly sequence key. A region that partially overlaps its chromosome is intersected with `[0, chromosomeLength)` and succeeds with `clamped: true`. A malformed region, unknown sequence, or region with no overlap is rejected. Check mutation results when values come from user or external input.

Interaction callbacks are functions and are therefore not part of serializable collection or saved-session JSON. Collection entries are create input; they become nested runtime instances only after the selected module creates them. Runtime context is also derived rather than serialized.

## Public boundary

Application code should use runtime exports from `@weng-lab/genomebrowser`. The ordinary path is `GenomeBrowser`, store factories, and modules registered from another package or application code. The custom-module path adds `defineTrackModule`, `fetchOnChange`, focused hooks, and module contract types. The curated modules are exported by `@weng-lab/genomebrowser-tracks`, not core. Files inside either package's `src` tree are implementation details.
