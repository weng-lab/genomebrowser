# Core documentation

Use `@weng-lab/genomebrowser` to render genomic tracks, manage the viewport and track state, and implement custom track types. These docs ship with the package.

## Reviewed API reference

The [reference index](reference/README.md) maps every public core export to its reference page, including the schema CLI.

- [GenomeBrowser](reference/GenomeBrowser.md): rendering, responsive and fixed sizing, and magnification.
- [Track store](reference/trackStore.md): registration, mutations, ordering, and pinning.
- [Browser store](reference/browserStore.md): initialization, navigation, selection, and highlights.
- [Assemblies and regions](reference/assembliesAndRegions.md): presets, custom definitions, coordinates, parsing, and validation.
- [Track modules](reference/trackModules.md): definition, creation, fetch/render contracts, resources, settings, and interactions.
- [Runtime helpers](reference/runtimeHelpers.md): schema markers, renderer hooks, and settings grouping.
- [TrackOverlay](reference/TrackOverlay.md) and [TrackLabel](reference/TrackLabel.md): fixed SVG annotations.
- [Collections](reference/collections.md): authored tracks, view schemas, validation, and CLI generation.
- [Context menus](reference/contextMenus.md): menu state, hooks, and built-in behavior.

## Documentation awaiting migration

The remaining pages are in [legacy/](legacy/README.md). Their placement marks documentation that has not completed review under the new structure; it does not mean the APIs themselves are deprecated. Use the reviewed references above when topics overlap.

For initial setup, the existing [getting-started page](legacy/gettingStarted.md) remains available while the cumulative tutorial is developed. The legacy index lists the remaining tutorials, guides, and troubleshooting material.

## Package boundaries

Core owns the runtime and public extension contracts. First-party modules come from `@weng-lab/genomebrowser-tracks`. Optional application controls, including TrackSelect, come from `@weng-lab/genomebrowser-ui`; they can share the runtime's stores. Package internals are not public import paths.

Hosted renderers, settings, and tooltips use [useGenomeBrowser](reference/browserStore.md#usegenomebrowser) to access their browser and track stores.
