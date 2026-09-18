# Core API reference

Import all runtime APIs and types below from `@weng-lab/genomebrowser`. The package has one public JavaScript entry point and also installs the `genomebrowser` CLI. Each API page includes its related types.

## Browse by area

- [Browser setup](01-browserSetup/README.md): Render a browser, create its stores, and access them from hosted components.
- [Assemblies and regions](02-assembliesAndRegions/README.md): Choose sequence definitions and parse or validate genomic regions.
- [Track definition](03-trackDefinition/README.md): Define modules, create instances, fetch data, and supply settings forms.
- [Renderer integration](04-rendererIntegration/README.md): Draw track data and connect SVG content to interactions, tooltips, and automatic sizing.
- [Collections and schemas](05-collectionsAndSchemas/README.md): Define track collections, validate their input, and generate JSON schemas for editors.

## Public export index

Look up an export below to find its documentation. Store methods and module members are documented on the corresponding store or module page.

### Browser setup

| Exports                                                                             | Reference                                                                                                            |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `GenomeBrowser`, `GenomeBrowserProps`                                               | [GenomeBrowser](01-browserSetup/GenomeBrowser.md)                                                                    |
| `createBrowserStore`, `BrowserStoreInput`                                           | [Store creation](01-browserSetup/browserStore.md#createbrowserstore-and-browserstoreinput)                           |
| `BrowserStore`, `BrowserStoreInstance`                                              | [State and store instance](01-browserSetup/browserStore.md#browserstore-and-browserstoreinstance)                    |
| `BrowserRegionMutationResult`, `BrowserRegionMutationErrorCode`                     | [Navigation results](01-browserSetup/browserStore.md#browserregionmutationresult-and-browserregionmutationerrorcode) |
| `BrowserViewportMutationResult`                                                     | [Fixed width](01-browserSetup/browserStore.md#fixed-width)                                                           |
| `BrowserSelectionMode`, `SelectionHighlightStyle`, `BrowserSelectionMutationResult` | [Selection](01-browserSetup/browserStore.md#selection)                                                               |
| `BrowserHighlightMutationResult`, `Highlight`                                       | [Highlights](01-browserSetup/browserStore.md#highlights)                                                             |
| `useGenomeBrowser`, `GenomeBrowserStores`                                           | [Hosting browser stores](01-browserSetup/useGenomeBrowser.md#usegenomebrowser)                                       |
| `createTrackStore`, `TrackStoreOptions`                                             | [Store creation](01-browserSetup/trackStore.md#createtrackstore-and-trackstoreoptions)                               |
| `TrackStore`, `TrackStoreInstance`                                                  | [State and store instance](01-browserSetup/trackStore.md#trackstore-and-trackstoreinstance)                          |
| `ModuleRegistry`                                                                    | [Module registry](01-browserSetup/trackStore.md#moduleregistry)                                                      |
| `MutationFailure`, `TrackMutationErrorCode`, `TrackMutationResult`                  | [Mutation results](01-browserSetup/trackStore.md#mutation-results)                                                   |
| `TrackUpdate`, `TrackBaseUpdate`                                                    | [Update patches](01-browserSetup/trackStore.md#trackupdate-and-trackbaseupdate)                                      |

### Assemblies and regions

| Exports                                          | Reference                                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `createAssemblyDefinition`, `AssemblyDefinition` | [Custom assemblies](02-assembliesAndRegions/assemblies.md#createassemblydefinition)          |
| `hg38`, `mm10`, `ce11`, `dm6`, `tair10`          | [Built-in assemblies](02-assembliesAndRegions/assemblies.md#built-in-assemblies)             |
| `GenomicRegion`                                  | [Coordinates](02-assembliesAndRegions/regions.md#coordinates)                                |
| `parseRegion`                                    | [String parsing](02-assembliesAndRegions/regions.md#parseregion)                             |
| `normalizeRegion`                                | [Region normalization](02-assembliesAndRegions/regions.md#normalizeregion)                   |
| `RegionResult`, `RegionErrorCode`                | [Normalization results](02-assembliesAndRegions/regions.md#regionresult-and-regionerrorcode) |

### Track definition

| Exports                                                                                                           | Reference                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `defineTrackModule`                                                                                               | [defineTrackModule](03-trackDefinition/defineTrackModule.md#definetrackmodule)                                  |
| `TrackModule`, `ModuleCreateInput`, `ModuleInstance`, `AnyTrackModule`, `AnyTrackInstance`, `AnyTrackInteraction` | [TrackModule and inferred types](03-trackDefinition/defineTrackModule.md#trackmodule-and-inferred-types)        |
| `TrackCreateInput`, `TrackBaseInput`, `TrackSource`                                                               | [TrackCreateInput and TrackBaseInput](03-trackDefinition/trackInstances.md#trackcreateinput-and-trackbaseinput) |
| `TrackInstance`, `TrackBase`, `ReadonlyTrackInstance`                                                             | [TrackInstance and TrackBase](03-trackDefinition/trackInstances.md#trackinstance-and-trackbase)                 |
| `TrackFetch`, `TrackFetchContext`, `TrackFetchTrack`, `TrackFetchDemand`                                          | [Fetching data](03-trackDefinition/fetchingData.md#fetching-data)                                               |
| `TrackResources`                                                                                                  | [TrackResources](03-trackDefinition/fetchingData.md#trackresources)                                             |
| `TrackSettingsComponent`, `TrackSettingsProps`                                                                    | [Settings](03-trackDefinition/trackSettings.md#settings)                                                        |
| `fetchOnChange`                                                                                                   | [fetchOnChange](03-trackDefinition/fetchOnChange.md#fetchonchange)                                              |

### Renderer integration

| Exports                                                                                           | Reference                                                                                |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `TrackRenderer`, `TrackRendererProps`                                                             | [Rendering](04-rendererIntegration/trackRenderer.md#rendering)                           |
| `TrackInteraction`, `TrackInteractionCallback`, `TrackRuntimeContext`, `TrackRendererInteraction` | [Interactions and tooltips](04-rendererIntegration/useInteraction.md#instance-callbacks) |
| `useInteraction`                                                                                  | [useInteraction](04-rendererIntegration/useInteraction.md#useinteraction)                |
| `useTooltip`                                                                                      | [useTooltip](04-rendererIntegration/useTooltip.md#usetooltip)                            |
| `useAutoTrackHeight`, `AutoTrackHeightOptions`                                                    | [useAutoTrackHeight](04-rendererIntegration/useAutoTrackHeight.md#useautotrackheight)    |
| `TrackOverlay`, `TrackOverlayProps`                                                               | [TrackOverlay](04-rendererIntegration/TrackOverlay.md)                                   |
| `TrackLabel`, `TrackLabelProps`                                                                   | [TrackLabel](04-rendererIntegration/TrackLabel.md)                                       |
| `TrackTooltipComponent`                                                                           | [Tooltip component](04-rendererIntegration/useTooltip.md#tracktooltipcomponent)          |

### Collections and schemas

| Exports                             | Reference                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `TrackCollection`                   | [TrackCollection](05-collectionsAndSchemas/trackCollection.md#trackcollection)                                                       |
| `TrackMetadata`                     | [TrackMetadata](05-collectionsAndSchemas/trackCollection.md#trackmetadata)                                                           |
| `TrackCollectionView`               | [TrackCollectionView](05-collectionsAndSchemas/trackCollection.md#trackcollectionview)                                               |
| `TrackCollectionColumn`             | [TrackCollectionColumn](05-collectionsAndSchemas/trackCollection.md#trackcollectioncolumn)                                           |
| `validateTrackCollection`           | [validateTrackCollection](05-collectionsAndSchemas/validateTrackCollection.md#validatetrackcollection)                               |
| `generateTrackCollectionJsonSchema` | [generateTrackCollectionJsonSchema](05-collectionsAndSchemas/generateTrackCollectionJsonSchema.md#generatetrackcollectionjsonschema) |

The [schema CLI](05-collectionsAndSchemas/schemaCli.md) documents `genomebrowser schema`, including file output and `--check`. Generated schemas depend on the supplied modules; no fixed collection schema or additional JavaScript subpath is exported.

Return to [Parent documentation](../README.md).
