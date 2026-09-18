# Core documentation

Use `@weng-lab/genomebrowser` to render genomic tracks, manage the viewport and track state, and implement custom track types.

## Getting started

The tutorial builds one React integration across four chapters. Start with a responsive browser, then configure tracks, navigate and select regions, and work with track collections.

1. [Create a genome browser](gettingStarted/firstBrowser.md): choose a setup path and connect the assembly, stores, and first tracks.
2. [Add and configure tracks](gettingStarted/configureTracks.md): add tracks, change their settings and order, and handle feature clicks.
3. [Navigate and select regions](gettingStarted/navigationAndSelection.md): pan, zoom, mark regions, and use the provided controls.
4. [Use track collections](gettingStarted/trackCollections.md): define and share collections, load tracks directly, or offer selection through TrackSelect.

## Guides

- [State and browser lifetime](guides/stateAndLifetime.md): choose store ownership, link views, and access state from application or hosted components.
- [Create a custom track](guides/customTracks.md): build a working annotation module, then add settings, interactions, and tooltips.
- [Customize an existing track module](guides/customizeTrackModules.md): reuse a module's fetcher and renderers with a different schema, settings form, or tooltip.
- [Data fetching and rendering](guides/dataFetching.md): use render demand, choose refetch inputs, and reuse resources across requests.

[Troubleshooting](troubleshooting.md) covers setup problems, rejected updates, and rendering errors.

## API reference

The [reference index](reference/README.md) links to documentation for every public core export and includes the schema CLI. Browse the reference by area:

- [Browser setup](reference/browserSetup/README.md): Render a browser, create its stores, and access them from hosted components.
- [Assemblies and regions](reference/assembliesAndRegions/README.md): Choose sequence definitions and parse or validate genomic regions.
- [Track definition](reference/trackDefinition/README.md): Define modules, create instances, fetch data, and supply settings forms.
- [Renderer integration](reference/rendererIntegration/README.md): Draw track data and connect SVG content to interactions, tooltips, and automatic sizing.
- [Collections and schemas](reference/collectionsAndSchemas/README.md): Define track collections, validate their input, and generate JSON schemas for editors.

## Package boundaries

Core renders the browser, manages requests, and defines the APIs for track modules. First-party modules come from `@weng-lab/genomebrowser-tracks`. Optional application controls, including TrackSelect, come from `@weng-lab/genomebrowser-ui`; they can share the runtime's stores. Package internals are not public import paths.

Hosted renderers, settings, and tooltips use [useGenomeBrowser](reference/browserSetup/useGenomeBrowser.md#usegenomebrowser) to access their browser and track stores.

## Further reading

These resources explain the libraries and web APIs used in core's public API:

- [Zod](https://zod.dev/): define configuration schemas, validate input, and infer TypeScript types for track modules.
- [Zustand](https://github.com/pmndrs/zustand): understand the store hooks returned by core, including selectors, subscriptions, and access outside React.
- [SVG on MDN](https://developer.mozilla.org/en-US/docs/Web/SVG): work with shapes, text, coordinates, and transforms when writing track renderers and tooltips.
