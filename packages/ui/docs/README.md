# UI documentation

Use `@weng-lab/genomebrowser-ui` to add application controls to a genome browser or display a chromosome overview.

## Getting started

[Add browser controls](gettingStarted/addBrowserControls.md) builds a responsive browser with pan and zoom buttons, region selection controls, and a highlight dialog. It shows how to keep browser state across renders and open and close the dialog. See [installation and license setup](../README.md#install) before running the example.

## Guides

- [Choose tracks from collections](guides/trackSelection.md): connect a picker, set defaults, save selections, and customize collection views.
- [Handle collection track interactions](guides/trackInteractions.md): attach callbacks from application code and use current runtime values alongside collection metadata.
- [Connect a chromosome overview](guides/chromosomeOverview.md): load cytobands, show the browser region and highlights, and navigate when a highlight is activated.

[Troubleshooting](troubleshooting.md) covers validation failures, unexpected selections, and missing content.

## API reference

The [reference index](reference/README.md) lists every public UI component, helper, and type.

- [Browser controls](reference/browserControls/README.md): pan, zoom, and region interaction modes.
- [Highlights](reference/highlights/README.md): add, edit, remove, and navigate to marked regions.
- [Chromosome overview](reference/chromosomeOverview/README.md): cytobands, region brackets, highlight overlays, and tooltips.
- [Track selection](reference/trackSelection/README.md): selection lifecycle, column customization, and interaction callbacks.

## Package responsibilities

Core owns `GenomeBrowser`, browser and track stores, and the collection format. Tracks supplies first-party modules and their settings forms and tooltips. UI supplies the application controls documented here. Reader supplies the cytoband records and file reader consumed by the chromosome overview guide.

Import UI components from `@weng-lab/genomebrowser-ui`. It has one public JavaScript entry point. Import core, track, and reader APIs from their own packages; UI does not re-export them.
