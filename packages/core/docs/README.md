# Core documentation

Use `@weng-lab/genomebrowser` to render genomic tracks, manage the viewport and track state, and implement custom track types. These docs ship with the package.

## API reference

The [reference index](reference/README.md) maps every public core export to its canonical page and includes the schema CLI. Browse the reference by area:

- [Browser setup](reference/browserSetup/README.md): Render a browser, own its stores, and access them from hosted components.
- [Assemblies and regions](reference/assembliesAndRegions/README.md): Choose sequence definitions and parse or validate genomic intervals.
- [Track definition](reference/trackDefinition/README.md): Define modules, create instances, fetch data, and supply settings forms.
- [Renderer integration](reference/rendererIntegration/README.md): Draw track data and connect SVG content to interactions, tooltips, and automatic sizing.
- [Collections and schemas](reference/collectionsAndSchemas/README.md): Author and validate track catalogs and generate schemas for editor tooling.

## Documentation awaiting migration

The remaining pages are in [legacy/](legacy/README.md). Their placement marks documentation that has not completed review under the new structure; it does not mean the APIs themselves are deprecated. Use the reviewed references above when topics overlap.

For initial setup, the existing [getting-started page](legacy/gettingStarted.md) remains available while the cumulative tutorial is developed. The legacy index lists the remaining tutorials, guides, and troubleshooting material.

## Package boundaries

Core owns the runtime and public extension contracts. First-party modules come from `@weng-lab/genomebrowser-tracks`. Optional application controls, including TrackSelect, come from `@weng-lab/genomebrowser-ui`; they can share the runtime's stores. Package internals are not public import paths.

Hosted renderers, settings, and tooltips use [useGenomeBrowser](reference/browserSetup/useGenomeBrowser.md#usegenomebrowser) to access their browser and track stores.

See [release notes](releaseNotes.md) for breaking changes and migration guidance.
