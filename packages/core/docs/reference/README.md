# API reference

Import the APIs below from `@weng-lab/genomebrowser`. Related types are documented with the capability that owns them.

## Browser and viewport

| Exports                                                         | Reference                                                                                            |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `GenomeBrowser`, `GenomeBrowserProps`                           | [GenomeBrowser](GenomeBrowser.md)                                                                    |
| `createBrowserStore`, `BrowserStoreInput`                       | [Store creation](browserStore.md#createbrowserstore-and-browserstoreinput)                           |
| `BrowserStore`, `BrowserStoreInstance`                          | [State and store instance](browserStore.md#browserstore-and-browserstoreinstance)                    |
| `BrowserRegionMutationResult`, `BrowserRegionMutationErrorCode` | [Navigation results](browserStore.md#browserregionmutationresult-and-browserregionmutationerrorcode) |
| `BrowserViewportMutationResult`                                 | [Fixed width](browserStore.md#fixed-width)                                                           |
| `BrowserSelectionMode`, `SelectionHighlightStyle`               | [Selection](browserStore.md#selection)                                                               |
| `Highlight`                                                     | [Highlights](browserStore.md#highlights)                                                             |
| `useGenomeBrowser`, `GenomeBrowserStores`                       | [Hosting browser stores](browserStore.md#usegenomebrowser)                                           |

## Assemblies and regions

| Exports                                          | Reference                                                                         |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `createAssemblyDefinition`, `AssemblyDefinition` | [Custom assemblies](assembliesAndRegions.md#createassemblydefinition)             |
| `hg38`, `mm10`, `ce11`, `dm6`, `tair10`          | [Built-in assemblies](assembliesAndRegions.md#built-in-assemblies)                |
| `GenomicRegion`                                  | [Coordinates](assembliesAndRegions.md#coordinates)                                |
| `parseRegion`                                    | [String parsing](assembliesAndRegions.md#parseregion)                             |
| `normalizeRegion`                                | [Region normalization](assembliesAndRegions.md#normalizeregion)                   |
| `RegionResult`, `RegionErrorCode`                | [Normalization results](assembliesAndRegions.md#regionresult-and-regionerrorcode) |

## Track store

| Exports                                 | Reference                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------- |
| `createTrackStore`, `TrackStoreOptions` | [Store creation](trackStore.md#createtrackstore-and-trackstoreoptions)      |
| `TrackStore`, `TrackStoreInstance`      | [State and store instance](trackStore.md#trackstore-and-trackstoreinstance) |
| `ModuleRegistry`                        | [Module registry](trackStore.md#moduleregistry)                             |
| `TrackMutationResult`                   | [Mutation results](trackStore.md#mutation-results)                          |
| `TrackUpdate`, `TrackBaseUpdate`        | [Update patches](trackStore.md#trackupdate-and-trackbaseupdate)             |

## Track modules

| Exports                                                                                                                                       | Reference                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `defineTrackModule`                                                                                                                           | [defineTrackModule](trackModules.md#definetrackmodule)                                     |
| `TrackModule`, `ModuleCreateInput`, `ModuleInstance`, `AnyTrackModule`, `AnyTrackInstance`, `AnyTrackInteraction`, `AnyTrackTooltipComponent` | [TrackModule and inferred types](trackModules.md#trackmodule-and-inferred-types)           |
| `TrackCreateInput`, `TrackBaseInput`, `TrackSource`                                                                                           | [TrackCreateInput and TrackBaseInput](trackModules.md#trackcreateinput-and-trackbaseinput) |
| `TrackInstance`, `TrackBase`, `ReadonlyTrackInstance`                                                                                         | [TrackInstance and TrackBase](trackModules.md#trackinstance-and-trackbase)                 |
| `TrackFetch`, `TrackFetchContext`, `TrackFetchTrack`, `TrackFetchDemand`                                                                      | [Fetching data](trackModules.md#fetching-data)                                             |
| `TrackResources`                                                                                                                              | [TrackResources](trackModules.md#trackresources)                                           |
| `TrackRenderer`, `TrackRendererProps`                                                                                                         | [Rendering](trackModules.md#rendering)                                                     |
| `TrackSettingsComponent`, `TrackSettingsProps`                                                                                                | [Settings](trackModules.md#settings)                                                       |
| `TrackInteraction`, `TrackInteractionCallback`, `TrackRuntimeContext`, `TrackRendererInteraction`, `TrackTooltipComponent`                    | [Interactions and tooltips](trackModules.md#interactions-and-tooltips)                     |

## Runtime helpers

| Exports                                        | Reference                                                  |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `fetchOnChange`                                | [fetchOnChange](runtimeHelpers.md#fetchonchange)           |
| `useInteraction`                               | [useInteraction](runtimeHelpers.md#useinteraction)         |
| `useTooltip`                                   | [useTooltip](runtimeHelpers.md#usetooltip)                 |
| `useAutoTrackHeight`, `AutoTrackHeightOptions` | [useAutoTrackHeight](runtimeHelpers.md#useautotrackheight) |

## Overlays

| Exports                             | Reference                       |
| ----------------------------------- | ------------------------------- |
| `TrackOverlay`, `TrackOverlayProps` | [TrackOverlay](TrackOverlay.md) |
| `TrackLabel`, `TrackLabelProps`     | [TrackLabel](TrackLabel.md)     |

## Collections and schemas

| Exports                                            | Reference                                                                                                             |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `TrackCollection`                                  | [TrackCollection](collections.md#trackcollection)                                                                     |
| `TrackCollectionTrack`, `TrackCollectionEntry`     | [TrackCollectionTrack and TrackCollectionEntry](collections.md#trackcollectiontrack-and-trackcollectionentry)         |
| `TrackMetadata`                                    | [TrackMetadata](collections.md#trackmetadata)                                                                         |
| `TrackCollectionView`, `TrackCollectionViewSchema` | [TrackCollectionView and TrackCollectionViewSchema](collections.md#trackcollectionview-and-trackcollectionviewschema) |
| `TrackCollectionColumn`                            | [TrackCollectionColumn](collections.md#trackcollectioncolumn)                                                         |
| `validateTrackCollection`                          | [validateTrackCollection](collections.md#validatetrackcollection)                                                     |
| `createTrackCollectionSchema`                      | [createTrackCollectionSchema](collections.md#createtrackcollectionschema)                                             |
| `generateTrackCollectionJsonSchema`                | [generateTrackCollectionJsonSchema](collections.md#generatetrackcollectionjsonschema)                                 |

The [schema CLI](collections.md#schema-cli) documents the `genomebrowser schema` command.
