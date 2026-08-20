# First-party track modules

`@weng-lab/genomebrowser-tracks` contains six track modules for the `@weng-lab/genomebrowser` runtime. Use a module when your data matches its source format and you want its built-in MUI settings.

## Package boundaries

- `@weng-lab/genomebrowser` provides the browser runtime, stores, module contracts, schema helpers, and module-author hooks.
- `@weng-lab/genomebrowser-tracks` provides the BigBed, BigWig, BulkBed, CAVE, MethylC, and Transcript implementations. It also provides the settings and tooltip controls used by track modules.
- `@weng-lab/genomebrowser-ui` provides application controls that coordinate with the browser system as a whole.

Each module combines its fetcher, renderer, MUI settings component, and tooltip component. The package does not export those parts separately.

## Start here

- [Getting started](gettingStarted.md) shows how to install, create, and register the modules.
- [Export contract](exports.md) documents the shared module API and Zod schemas.
- [Shared APIs](shared.md) documents the single shared import path, feature groups, and pure helpers.
- [Track settings](trackSettings.md) documents the reusable settings controls and `TrackBaseSettings`.
- [Signal condensation](signal.md) documents the shared BigWig-to-pixel signal API.
- [Track tooltips](trackTooltips.md) documents `TrackTooltip` and the tooltip formatters.
- [Source layout](new-tracks.md) records the directory convention for track entries.
- [BigBed](tracks/bigbed.md) displays intervals from one BigBed source.
- [BigWig](tracks/bigwig.md) displays quantitative signal from one BigWig source.
- [BulkBed](tracks/bulkbed.md) displays several BigBed datasets in one row.
- [CAVE](tracks/cave.md) displays paired hmC and OXBS signals from package-selected datasets.
- [MethylC](tracks/methylc.md) displays plus- and minus-strand methylation channels.
- [Transcript](tracks/transcript.md) displays gene and transcript models from a GraphQL endpoint.

These docs cover the package root and its public subpaths. Files under `src` are internal; use only the documented `/shared` path for shared APIs.
