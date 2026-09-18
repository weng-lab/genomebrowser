# UI API reference

Import all components, helpers, and types below from `@weng-lab/genomebrowser-ui`. The package has one public JavaScript entry point. Each component or helper is documented with its related types.

The application owns runtime stores, collection data, and dialog visibility. Store-bound controls receive the same stores used by `GenomeBrowser`; `Cytobands` receives data and callbacks directly. See [package setup](../../README.md) for dependencies, MUI theming, and licensing.

## Browse by area

- [Browser controls](01-browserControls/README.md): Pan, zoom, and choose region interaction modes.
- [Highlights](02-highlights/README.md): Manage browser highlights.
- [Track selection](03-trackSelection/README.md): Browse collections, customize columns, and attach application callbacks.
- [Chromosome overview](04-chromosomeOverview/README.md): Display cytobands, the viewport, and interactive highlights.

- [Shared UI](05-sharedUI/README.md): Labeled outlines for custom content.

## Public export index

Every current public export has one canonical destination below.

| Area                | Exports                                                   | Reference                                                                                                             |
| ------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Shared UI           | `LabeledGroup`, `LabeledGroupProps`                       | [Control group](05-sharedUI/LabeledGroup.md#labeledgroupprops)                                                        |
| Browser controls    | `ControlToolbar`, `ControlToolbarProps`                   | [Browser toolbar](01-browserControls/ControlToolbar.md#controltoolbarprops)                                           |
| Browser controls    | `RegionControls`, `RegionControlsProps`                   | [RegionControls](01-browserControls/ControlToolbar.md#regioncontrols)                                                 |
| Browser controls    | `NavigationControls`, `NavigationControlsProps`           | [NavigationControls](01-browserControls/ControlToolbar.md#navigationcontrols)                                         |
| Browser controls    | `InteractionControls`, `InteractionControlsProps`         | [InteractionControls](01-browserControls/ControlToolbar.md#interactioncontrols)                                       |
| Browser controls    | `ManagementControls`, `ManagementControlsProps`           | [ManagementControls](01-browserControls/ControlToolbar.md#managementcontrols)                                         |
| Browser controls    | `NavigationButton`, `NavigationButtonProps`               | [Navigation button](01-browserControls/NavigationButton.md#navigationbuttonprops)                                     |
| Browser controls    | `NavigationAction`                                        | [Navigation actions](01-browserControls/NavigationButton.md#navigationaction)                                         |
| Browser controls    | `SelectionControls`, `SelectionControlsProps`             | [Selection controls](01-browserControls/SelectionControls.md#selectioncontrolsprops)                                  |
| Highlights          | `HighlightDialog`, `HighlightDialogProps`                 | [Highlight dialog](02-highlights/HighlightDialog.md#highlightdialogprops)                                             |
| Chromosome overview | `Cytobands`, `CytobandsProps`                             | [Cytobands](04-chromosomeOverview/Cytobands.md#cytobandsprops)                                                        |
| Chromosome overview | `CytobandColors`                                          | [Stain colors](04-chromosomeOverview/Cytobands.md#cytobandcolors)                                                     |
| Track selection     | `TrackSelect`, `TrackSelectProps`                         | [TrackSelect](03-trackSelection/TrackSelect.md#trackselectprops)                                                      |
| Track selection     | `TrackSelectColumnOverride`, `TrackSelectColumnOverrides` | [Column overrides](03-trackSelection/columnCustomization.md#trackselectcolumnoverride-and-trackselectcolumnoverrides) |
| Track selection     | `withValueMarkers`                                        | [Value markers](03-trackSelection/columnCustomization.md#withvaluemarkers)                                            |
| Track selection     | `ValueMarkerConfig`, `ValueMarkerMap`                     | [Marker configuration](03-trackSelection/columnCustomization.md#valuemarkerconfig-and-valuemarkermap)                 |
| Track selection     | `TrackSelectInteractionResolver`                          | [Interaction resolver](03-trackSelection/trackInteractions.md#trackselectinteractionresolver)                         |
| Track selection     | `TrackSelectInteraction`, `AnyTrackSelectInteraction`     | [Interaction callbacks](03-trackSelection/trackInteractions.md#trackselectinteraction-and-anytrackselectinteraction)  |
| Track selection     | `TrackSelectCollectionContext`                            | [Collection context](03-trackSelection/trackInteractions.md#trackselectcollectioncontext)                             |

Core owns the `TrackCollection` data format and its validation and schema APIs. Reader owns the `Cytoband` records consumed by `Cytobands`. These types are imported from their respective packages and are not re-exported by UI.

Return to [Parent documentation](../README.md).
