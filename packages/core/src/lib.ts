// Browser setup
export { GenomeBrowser } from "./browser/GenomeBrowser";
export type { GenomeBrowserProps } from "./browser/GenomeBrowser";
export { createBrowserStore } from "./browser/state/browserStore";
export type {
  BrowserSelectionMode,
  SelectionHighlightStyle,
  BrowserRegionMutationErrorCode,
  BrowserRegionMutationResult,
  BrowserStore,
  BrowserStoreInput,
  BrowserStoreInstance,
  BrowserViewportMutationResult,
  Highlight,
} from "./browser/state/browserStore";
export { createTrackStore } from "./browser/state/trackStore";
export type { TrackStore, TrackStoreInstance, TrackStoreOptions } from "./browser/state/trackStore";
export type { ModuleRegistry } from "./modules/registry";
export { useGenomeBrowser } from "./browser/state/browserContextState";
export type { GenomeBrowserStores } from "./browser/state/browserContextState";

// Assemblies and regions
export { createAssemblyDefinition } from "./genome/assembly";
export type { AssemblyDefinition } from "./genome/assembly";
export { hg38, mm10, ce11, dm6, tair10 } from "./genome/presets";
export { parseRegion, normalizeRegion } from "./genome/region";
export type { GenomicRegion, RegionErrorCode, RegionResult } from "./genome/region";

// Track definition
export { defineTrackModule } from "./modules/defineTrackModule";
export { fetchOnChange } from "./modules/fetchOnChange";
export type {
  AnyTrackInstance,
  AnyTrackInteraction,
  AnyTrackModule,
  AnyTrackTooltipComponent,
  ModuleCreateInput,
  ModuleInstance,
  ReadonlyTrackInstance,
  TrackBase,
  TrackBaseInput,
  TrackBaseUpdate,
  TrackCreateInput,
  TrackFetch,
  TrackFetchContext,
  TrackFetchDemand,
  TrackFetchTrack,
  TrackInstance,
  TrackInteraction,
  TrackInteractionCallback,
  TrackMutationResult,
  TrackModule,
  TrackRenderer,
  TrackRendererInteraction,
  TrackRendererProps,
  TrackResources,
  TrackSettingsComponent,
  TrackSource,
  TrackSettingsProps,
  TrackRuntimeContext,
  TrackTooltipComponent,
  TrackUpdate,
} from "./modules/types";

// Renderer integration
export { useInteraction } from "./modules/interaction";
export { useTooltip } from "./browser/tooltip/useTooltip";
export { useAutoTrackHeight } from "./browser/track-row/useAutoTrackHeight";
export type { AutoTrackHeightOptions } from "./browser/track-row/useAutoTrackHeight";
export { TrackOverlay } from "./browser/track-overlay/TrackOverlay";
export type { TrackOverlayProps } from "./browser/track-overlay/TrackOverlay";
export { TrackLabel } from "./browser/track-overlay/TrackLabel";
export type { TrackLabelProps } from "./browser/track-overlay/TrackLabel";

// Collections and schemas
export { validateTrackCollection } from "./collections/validateTrackCollection";
export {
  createTrackCollectionSchema,
  TrackCollectionViewSchema,
} from "./collections/collectionSchema";
export { generateTrackCollectionJsonSchema } from "./collections/generateJsonSchema";
export type {
  TrackCollection,
  TrackCollectionView,
  TrackCollectionColumn,
  TrackMetadata,
  TrackCollectionTrack,
} from "./collections/collectionSchema";
export type { TrackCollectionEntry } from "./modules/registry";

// Integration constant
export { defaultScreenGraphQlEndpoint } from "./screen";
