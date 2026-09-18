# Core documentation

Use `@weng-lab/genomebrowser` to render genomic tracks, manage the viewport and track state, and implement custom track types.

## Getting started

[Browse this section](01-gettingStarted/README.md).

The tutorial builds one React integration across four chapters. Start with a responsive browser, then configure tracks, navigate and select regions, and work with track collections.

1. [Create a genome browser](01-gettingStarted/01-firstBrowser.md): choose a setup path and connect the assembly, stores, and first tracks.
2. [Add and configure tracks](01-gettingStarted/02-configureTracks.md): add tracks, change their settings and order, and handle feature clicks.
3. [Navigate and select regions](01-gettingStarted/03-navigationAndSelection.md): pan, zoom, mark regions, and use the provided controls.
4. [Use track collections](01-gettingStarted/04-trackCollections.md): define and share collections, load tracks directly, or offer selection through TrackSelect.

## Guides

[Browse this section](02-guides/README.md).

- [State and browser lifetime](02-guides/stateAndLifetime.md): choose store ownership, link views, and access state from application or hosted components.
- [Customize an existing track module](02-guides/customizeTrackModules.md): reuse a module's fetcher and renderers with a different schema, settings form, or tooltip.
- [Create a custom track](02-guides/customTracks.md): build a working annotation module, then add settings, interactions, and tooltips.
- [Data fetching and rendering](02-guides/dataFetching.md): use render demand, choose refetch inputs, and reuse resources across requests.

[Troubleshooting](04-troubleshooting.md) covers setup problems, rejected updates, and rendering errors.

## API reference

The [reference index](03-reference/README.md) links to documentation for every public core export and includes the schema CLI. Browse the reference by area:

- [Browser setup](03-reference/01-browserSetup/README.md): Render a browser, create its stores, and access them from hosted components.
- [Assemblies and regions](03-reference/02-assembliesAndRegions/README.md): Choose sequence definitions and parse or validate genomic regions.
- [Track definition](03-reference/03-trackDefinition/README.md): Define modules, create instances, fetch data, and supply settings forms.
- [Renderer integration](03-reference/04-rendererIntegration/README.md): Draw track data and connect SVG content to interactions, tooltips, and automatic sizing.
- [Collections and schemas](03-reference/05-collectionsAndSchemas/README.md): Define track collections, validate their input, and generate JSON schemas for editors.

## Package boundaries

Core renders the browser, manages requests, and defines the APIs for track modules. First-party modules come from `@weng-lab/genomebrowser-tracks`. Optional application controls, including TrackSelect, come from `@weng-lab/genomebrowser-ui`; they can share the runtime's stores. Package internals are not public import paths.

Hosted renderers, settings, and tooltips use [useGenomeBrowser](03-reference/01-browserSetup/useGenomeBrowser.md#usegenomebrowser) to access their browser and track stores.

## Further reading

These resources explain the libraries and web APIs used in core's public API:

- [Zod](https://zod.dev/): define configuration schemas, validate input, and infer TypeScript types for track modules.
- [Zustand](https://github.com/pmndrs/zustand): understand the store hooks returned by core, including selectors, subscriptions, and access outside React.
- [SVG on MDN](https://developer.mozilla.org/en-US/docs/Web/SVG): work with shapes, text, coordinates, and transforms when writing track renderers and tooltips.

Return to [Package overview](../README.md).
