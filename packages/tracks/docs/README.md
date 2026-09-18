# Tracks documentation

Use `@weng-lab/genomebrowser-tracks` to display common genomic file formats with first-party track modules, or reuse its settings controls and rendering utilities in custom modules.

## Getting started

[Browse this section](01-gettingStarted/README.md).

[Use first-party tracks](01-gettingStarted/01-useTracks.md) builds a responsive browser with a coordinate ruler and a BigWig signal track. It covers installation, module registration, source requirements, and initial display settings.

For an existing browser, start with [Choose a track module](03-reference/01-trackModules/README.md), then open the module's reference for its configuration and behavior. Use [Data source troubleshooting](04-troubleshooting.md) when a track accepts its configuration but cannot load its file.

## Common tasks

- [Settings form layout](03-reference/05-settingsComponents/formLayout.md): arrange shared controls into sections and responsive fields.
- [BED schemas](03-reference/03-dataPrimitives/bedSchemas.md): select and reuse column schemas for BigBed and BulkBed tracks.

For the complete custom-module workflow, including fetching, rendering, and registration, use the [core documentation](https://github.com/weng-lab/genomebrowser/blob/main/packages/core/docs/README.md).

## API reference

The [reference index](03-reference/README.md) maps public exports and package subpaths to their documentation. Browse by task:

- [Track modules](03-reference/01-trackModules/README.md): create and configure BigWig, BigBed, BulkBed, cCRE BigBed, Gene, MethylC, CAVE, and Ruler tracks.
- [Collections and schemas](03-reference/02-collectionsAndSchemas/README.md): register all first-party modules and use the bundled collection JSON schema.
- [BED schemas and signal processing](03-reference/03-dataPrimitives/README.md): parse BED columns and condense signal records into rendered pixels.
- [Coordinates and layout](03-reference/04-coordinatesAndLayout/README.md): convert coordinates, pack overlapping features, and coordinate row height with track height.
- [Settings components](03-reference/05-settingsComponents/README.md): compose forms, edit track properties, and handle accepted values and drafts.
- [Tooltips](03-reference/06-tooltips/README.md): render SVG tooltip content and format genomic coordinates and signal values.

## Package boundaries

Core owns the browser component, stores, module contracts, and renderer hooks. Tracks supplies the first-party implementations and reusable components documented here. Optional application controls, such as collection-based track selection, belong to `@weng-lab/genomebrowser-ui`.

Import an individual module from its track subpath, such as `@weng-lab/genomebrowser-tracks/bigwig`. The package root exports `firstPartyTrackModules` and loads all eight modules. The `/shared` entry exports reusable utilities and components without loading any first-party modules. Internal files are not public import paths.

Return to [Package overview](../README.md).
