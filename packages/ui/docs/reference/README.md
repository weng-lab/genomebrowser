# UI API reference

Import all components, helpers, and types below from `@weng-lab/genomebrowser-ui`. The package has one public JavaScript entry point. Supporting types share a reference with their owning capability.

The application owns runtime stores, collection data, and dialog visibility. Store-bound controls receive the same stores used by `GenomeBrowser`; `Cytobands` receives data and callbacks directly. See [package setup](../../README.md) for dependencies, MUI theming, and licensing.

## Browse by area

- [Browser controls](browserControls/README.md): Pan, zoom, and choose region interaction modes.
- [Highlights](highlights/README.md): Manage browser highlights.
- [Chromosome overview](chromosomeOverview/README.md): Display cytobands, the viewport, and interactive loci.
- [Track selection](trackSelection/README.md): Browse collections, customize columns, and attach application callbacks.

## Public export index

Every current public export has one canonical destination below.

| Area                | Exports                                                     | Reference                                                                                                          |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Browser controls    | `BrowserNavigationButton`, `BrowserNavigationButtonProps`   | [Navigation button](browserControls/BrowserNavigationButton.md#browsernavigationbuttonprops)                       |
| Browser controls    | `BrowserNavigationAction`                                   | [Navigation actions](browserControls/BrowserNavigationButton.md#browsernavigationaction)                           |
| Browser controls    | `BrowserSelectionControls`, `BrowserSelectionControlsProps` | [Selection controls](browserControls/BrowserSelectionControls.md#browserselectioncontrolsprops)                    |
| Highlights          | `HighlightDialog`, `HighlightDialogProps`                   | [Highlight dialog](highlights/HighlightDialog.md#highlightdialogprops)                                             |
| Chromosome overview | `Cytobands`, `CytobandsProps`                               | [Cytobands](chromosomeOverview/Cytobands.md#cytobandsprops)                                                        |
| Chromosome overview | `CytobandColors`                                            | [Stain colors](chromosomeOverview/Cytobands.md#cytobandcolors)                                                     |
| Track selection     | `TrackSelect`, `TrackSelectProps`                           | [TrackSelect](trackSelection/TrackSelect.md#trackselectprops)                                                      |
| Track selection     | `TrackSelectColumnOverride`, `TrackSelectColumnOverrides`   | [Column overrides](trackSelection/columnCustomization.md#trackselectcolumnoverride-and-trackselectcolumnoverrides) |
| Track selection     | `withValueMarkers`                                          | [Value markers](trackSelection/columnCustomization.md#withvaluemarkers)                                            |
| Track selection     | `ValueMarkerConfig`, `ValueMarkerMap`                       | [Marker configuration](trackSelection/columnCustomization.md#valuemarkerconfig-and-valuemarkermap)                 |
| Track selection     | `TrackSelectInteractionResolver`                            | [Interaction resolver](trackSelection/trackInteractions.md#trackselectinteractionresolver)                         |
| Track selection     | `TrackSelectInteraction`, `AnyTrackSelectInteraction`       | [Interaction callbacks](trackSelection/trackInteractions.md#trackselectinteraction-and-anytrackselectinteraction)  |
| Track selection     | `TrackSelectCollectionContext`                              | [Collection context](trackSelection/trackInteractions.md#trackselectcollectioncontext)                             |

Core owns the `TrackCollection` data format and its validation and schema APIs. Reader owns the `Cytoband` records consumed by `Cytobands`. These types are imported from their respective packages and are not re-exported by UI.
