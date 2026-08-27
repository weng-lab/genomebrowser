# First-party track modules

`@weng-lab/genomebrowser-tracks` contains eight track modules for the `@weng-lab/genomebrowser` runtime. Use a module when your data matches its source format and you want its built-in MUI settings.

## Get started

[Getting started](gettingStarted.md) covers installation, a complete minimal browser, schema validation, and module registration.

## Choose a built-in track

Use the [track catalog](tracks/README.md) to choose among BigBed, cCRE BigBed, BigWig, BulkBed, CAVE, Gene, MethylC, and Transcript. The catalog groups tracks by the kind of source they read and links to each track's configuration reference.

## Fix data source problems

[Data source troubleshooting](dataSources.md) covers browser access, cross-origin resource sharing, byte-range responses, and the Transcript proxy requirement.

## Use the module API

- [Module API](exports.md) lists public package entries, modules, schemas, and types.
- [Shared APIs](shared.md) covers layout, coordinate, settings, tooltip, and signal helpers from the public `/shared` path.
- [Signal condensation](signal.md) documents the shared BigWig-to-pixel conversion.

Each track subpath exports one complete module. BigBed also exports its schema-aware row fetch helper for specialized modules. Other track-specific implementation parts are internal.

## Author a custom module

- [Author track settings](trackSettings.md) explains settings ownership, layout, validation, and updates.
- [Settings component API](trackSettingsApi.md) is the exhaustive settings reference.
- [Author track tooltips](trackTooltips.md) covers tooltip content, formatting, and accessibility.

`@weng-lab/genomebrowser` owns the runtime, stores, module contracts, and module-author hooks. This package owns the MUI settings controls, tooltip components, and helpers documented here. Files under `src` are internal. Import shared APIs only from `@weng-lab/genomebrowser-tracks/shared`.
