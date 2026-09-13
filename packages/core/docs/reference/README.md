# Core API reference

Import all runtime APIs and types below from `@weng-lab/genomebrowser`. The package has one public JavaScript entry point and also installs the `genomebrowser` CLI. Supporting types share a reference with their owning capability.

## Browse by area

- [Browser setup](browserSetup/README.md): Render a browser, own its stores, and access them from hosted components.
- [Assemblies and regions](assembliesAndRegions/README.md): Choose sequence definitions and parse or validate genomic intervals.
- [Track definition](trackDefinition/README.md): Define modules, create instances, fetch data, and supply settings forms.
- [Renderer integration](rendererIntegration/README.md): Draw track data and connect SVG content to interactions, tooltips, and automatic sizing.
- [Collections and schemas](collectionsAndSchemas/README.md): Author and validate track catalogs and generate schemas for editor tooling.

## Public export index

Each current export has one canonical destination below. Store methods and module members are documented on the corresponding store or module page.

### Browser setup

| Exports                                                                             | Reference                                                                                                         |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `GenomeBrowser`, `GenomeBrowserProps`                                               | [GenomeBrowser](browserSetup/GenomeBrowser.md)                                                                    |
| `createBrowserStore`, `BrowserStoreInput`                                           | [Store creation](browserSetup/browserStore.md#createbrowserstore-and-browserstoreinput)                           |
| `BrowserStore`, `BrowserStoreInstance`                                              | [State and store instance](browserSetup/browserStore.md#browserstore-and-browserstoreinstance)                    |
| `BrowserRegionMutationResult`, `BrowserRegionMutationErrorCode`                     | [Navigation results](browserSetup/browserStore.md#browserregionmutationresult-and-browserregionmutationerrorcode) |
| `BrowserViewportMutationResult`                                                     | [Fixed width](browserSetup/browserStore.md#fixed-width)                                                           |
| `BrowserSelectionMode`, `SelectionHighlightStyle`, `BrowserSelectionMutationResult` | [Selection](browserSetup/browserStore.md#selection)                                                               |
| `BrowserHighlightMutationResult`, `Highlight`                                       | [Highlights](browserSetup/browserStore.md#highlights)                                                             |
| `useGenomeBrowser`, `GenomeBrowserStores`                                           | [Hosting browser stores](browserSetup/useGenomeBrowser.md#usegenomebrowser)                                       |
| `createTrackStore`, `TrackStoreOptions`                                             | [Store creation](browserSetup/trackStore.md#createtrackstore-and-trackstoreoptions)                               |
| `TrackStore`, `TrackStoreInstance`                                                  | [State and store instance](browserSetup/trackStore.md#trackstore-and-trackstoreinstance)                          |
| `ModuleRegistry`                                                                    | [Module registry](browserSetup/trackStore.md#moduleregistry)                                                      |
| `MutationFailure`, `TrackMutationErrorCode`, `TrackMutationResult`                  | [Mutation results](browserSetup/trackStore.md#mutation-results)                                                   |
| `TrackUpdate`, `TrackBaseUpdate`                                                    | [Update patches](browserSetup/trackStore.md#trackupdate-and-trackbaseupdate)                                      |

### Assemblies and regions

| Exports                                          | Reference                                                                                 |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `createAssemblyDefinition`, `AssemblyDefinition` | [Custom assemblies](assembliesAndRegions/assemblies.md#createassemblydefinition)          |
| `hg38`, `mm10`, `ce11`, `dm6`, `tair10`          | [Built-in assemblies](assembliesAndRegions/assemblies.md#built-in-assemblies)             |
| `GenomicRegion`                                  | [Coordinates](assembliesAndRegions/regions.md#coordinates)                                |
| `parseRegion`                                    | [String parsing](assembliesAndRegions/regions.md#parseregion)                             |
| `normalizeRegion`                                | [Region normalization](assembliesAndRegions/regions.md#normalizeregion)                   |
| `RegionResult`, `RegionErrorCode`                | [Normalization results](assembliesAndRegions/regions.md#regionresult-and-regionerrorcode) |

### Track definition

| Exports                                                                                                           | Reference                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `defineTrackModule`                                                                                               | [defineTrackModule](trackDefinition/defineTrackModule.md#definetrackmodule)                                  |
| `TrackModule`, `ModuleCreateInput`, `ModuleInstance`, `AnyTrackModule`, `AnyTrackInstance`, `AnyTrackInteraction` | [TrackModule and inferred types](trackDefinition/defineTrackModule.md#trackmodule-and-inferred-types)        |
| `TrackCreateInput`, `TrackBaseInput`, `TrackSource`                                                               | [TrackCreateInput and TrackBaseInput](trackDefinition/trackInstances.md#trackcreateinput-and-trackbaseinput) |
| `TrackInstance`, `TrackBase`, `ReadonlyTrackInstance`                                                             | [TrackInstance and TrackBase](trackDefinition/trackInstances.md#trackinstance-and-trackbase)                 |
| `TrackFetch`, `TrackFetchContext`, `TrackFetchTrack`, `TrackFetchDemand`                                          | [Fetching data](trackDefinition/fetchingData.md#fetching-data)                                               |
| `TrackResources`                                                                                                  | [TrackResources](trackDefinition/fetchingData.md#trackresources)                                             |
| `TrackSettingsComponent`, `TrackSettingsProps`                                                                    | [Settings](trackDefinition/trackSettings.md#settings)                                                        |
| `fetchOnChange`                                                                                                   | [fetchOnChange](trackDefinition/fetchOnChange.md#fetchonchange)                                              |

### Renderer integration

| Exports                                                                                           | Reference                                                                             |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `TrackRenderer`, `TrackRendererProps`                                                             | [Rendering](rendererIntegration/trackRenderer.md#rendering)                           |
| `TrackInteraction`, `TrackInteractionCallback`, `TrackRuntimeContext`, `TrackRendererInteraction` | [Interactions and tooltips](rendererIntegration/useInteraction.md#instance-callbacks) |
| `useInteraction`                                                                                  | [useInteraction](rendererIntegration/useInteraction.md#useinteraction)                |
| `useTooltip`                                                                                      | [useTooltip](rendererIntegration/useTooltip.md#usetooltip)                            |
| `useAutoTrackHeight`, `AutoTrackHeightOptions`                                                    | [useAutoTrackHeight](rendererIntegration/useAutoTrackHeight.md#useautotrackheight)    |
| `TrackOverlay`, `TrackOverlayProps`                                                               | [TrackOverlay](rendererIntegration/TrackOverlay.md)                                   |
| `TrackLabel`, `TrackLabelProps`                                                                   | [TrackLabel](rendererIntegration/TrackLabel.md)                                       |
| `TrackTooltipComponent`                                                                           | [Tooltip component](rendererIntegration/useTooltip.md#tracktooltipcomponent)          |

### Collections and schemas

| Exports                             | Reference                                                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `TrackCollection`                   | [TrackCollection](collectionsAndSchemas/trackCollection.md#trackcollection)                                                       |
| `TrackMetadata`                     | [TrackMetadata](collectionsAndSchemas/trackCollection.md#trackmetadata)                                                           |
| `TrackCollectionView`               | [TrackCollectionView](collectionsAndSchemas/trackCollection.md#trackcollectionview)                                               |
| `TrackCollectionColumn`             | [TrackCollectionColumn](collectionsAndSchemas/trackCollection.md#trackcollectioncolumn)                                           |
| `validateTrackCollection`           | [validateTrackCollection](collectionsAndSchemas/validateTrackCollection.md#validatetrackcollection)                               |
| `generateTrackCollectionJsonSchema` | [generateTrackCollectionJsonSchema](collectionsAndSchemas/generateTrackCollectionJsonSchema.md#generatetrackcollectionjsonschema) |

The [schema CLI](collectionsAndSchemas/schemaCli.md) documents `genomebrowser schema`, including file output and `--check`. Generated schemas depend on the supplied modules; no fixed collection schema or additional JavaScript subpath is exported.
