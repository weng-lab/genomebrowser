# Tracks documentation

Use `@weng-lab/genomebrowser-tracks` to display common genomic file formats with first-party track modules, or reuse its settings controls and rendering utilities in custom modules.

## Getting started

[Use first-party tracks](gettingStarted/useTracks.md) builds a responsive browser with a coordinate ruler and a BigWig signal track. It covers installation, module registration, source requirements, and initial display settings.

For an existing browser, start with [Choose a track module](reference/trackModules/README.md), then open the module's reference for its configuration and behavior. Use [Data source troubleshooting](legacy/dataSources.md) when a track accepts its configuration but cannot load its file.

## Guides

- [Author track settings](legacy/trackSettings.md): compose a settings form with shared controls and return validated mutation results.
- [BED schema examples](legacy/bedSchemaExamples.md): configure BigBed and BulkBed tracks with ChromHMM and cCRE sources.

For the complete custom-module workflow, including fetching, rendering, and registration, use the [core documentation](https://github.com/weng-lab/genomebrowser/blob/main/packages/core/docs/README.md).

## API reference

The [reference index](reference/README.md) maps public exports and package subpaths to their documentation. Browse by task:

- [Track modules](reference/trackModules/README.md): create and configure BigWig, BigBed, BulkBed, cCRE BigBed, Gene, MethylC, CAVE, and Ruler tracks.
- [Collections and schemas](reference/collectionsAndSchemas/README.md): register all first-party modules and use the bundled collection JSON schema.
- [Coordinates and layout](reference/coordinatesAndLayout/README.md): convert coordinates, pack overlapping features, and coordinate row height with track height.
- [BED schemas and signal processing](reference/dataPrimitives/README.md): parse BED columns and condense signal records into rendered pixels.
- [Settings components](reference/settingsComponents/README.md): compose forms, edit track properties, and handle accepted values and drafts.
- [Tooltips](reference/tooltips/README.md): render SVG tooltip content and format genomic coordinates and signal values.

## Package boundaries

Core owns the browser component, stores, module contracts, and renderer hooks. Tracks supplies the first-party implementations and reusable components documented here. Optional application controls, such as collection-based track selection, belong to `@weng-lab/genomebrowser-ui`.

Import an individual module from its track subpath, such as `@weng-lab/genomebrowser-tracks/bigwig`. The package root exports `firstPartyTrackModules` and loads all eight modules. The `/shared` entry exports reusable utilities and components without loading any first-party modules. Internal files are not public import paths.

[Release notes](legacy/releaseNotes.md) retain package history and migration information.
