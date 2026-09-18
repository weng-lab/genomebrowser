# UI documentation

Use `@weng-lab/genomebrowser-ui` to add application controls to a genome browser or display a chromosome overview.

## Getting started

[Browse this section](01-gettingStarted/README.md).

[Add browser controls](01-gettingStarted/01-addBrowserControls.md) builds a responsive browser with pan and zoom buttons, region selection controls, and a highlight dialog. It shows how to keep browser state across renders and open and close the dialog. See [installation and license setup](../README.md#install) before running the example.

## Guides

[Browse this section](02-guides/README.md).

- [Choose tracks from collections](02-guides/trackSelection.md): connect a picker, set defaults, save selections, and customize collection views.
- [Handle collection track interactions](02-guides/trackInteractions.md): attach callbacks from application code and use current runtime values alongside collection metadata.
- [Connect a chromosome overview](02-guides/chromosomeOverview.md): load cytobands, show the browser region and highlights, and navigate when a highlight is activated.

[Troubleshooting](04-troubleshooting.md) covers validation failures, unexpected selections, and missing content.

## API reference

The [reference index](03-reference/README.md) lists every public UI component, helper, and type.

- [Browser controls](03-reference/01-browserControls/README.md): region search, pan, zoom, and region interaction modes.
- [Highlights](03-reference/02-highlights/README.md): add, edit, remove, and navigate to marked regions.
- [Track selection](03-reference/03-trackSelection/README.md): selection lifecycle, column customization, and interaction callbacks.
- [Chromosome overview](03-reference/04-chromosomeOverview/README.md): cytobands, region brackets, highlight overlays, and tooltips.

- [Shared UI](03-reference/05-sharedUI/README.md): Labeled outlines for custom content.

## Package responsibilities

Core owns `GenomeBrowser`, browser and track stores, and the collection format. Tracks supplies first-party modules and their settings forms and tooltips. UI supplies the application controls documented here. Reader supplies the cytoband records and file reader consumed by the chromosome overview guide.

Import UI components from `@weng-lab/genomebrowser-ui`. It has one public JavaScript entry point. Import core, track, and reader APIs from their own packages; UI does not re-export them.
