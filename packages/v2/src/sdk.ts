export { createModuleRegistry } from "./modules/registry";
export { defineTrackModule } from "./modules/defineTrackModule";
export { browserRegionSchema, formatLength, parseRegion, regionLength } from "./utils/region";
export { createReverseXScale, createXScale } from "./utils/scale";
export { svgPoint } from "./utils/svg";
export { useDraggableSettingsModal } from "./hooks/useDraggableSettingsModal";
export { useInteraction } from "./hooks/useInteraction";
export { createSettingsStore } from "./settings/settingsStore";
export { useBrowserStore, useSettingsStore } from "./stores/BrowserContext";
export type { DraggableSettingsModalResult } from "./hooks/useDraggableSettingsModal";

export type {
  AnyTrackModule,
  TrackConfigBase,
  TrackFetchContext,
  TrackInteractionCallback,
  TrackInteractionConfig,
  TrackInteractionContext,
  TrackModule,
  TrackRendererProps,
  TrackSettingsProps,
  TrackSettingsUpdate,
  TrackTooltipComponent,
  TrackTooltipProps,
} from "./modules/types";
export type {
  BrowserStore,
  BrowserStoreInput,
  BrowserStoreInstance,
  Highlight,
} from "./stores/browserStore";
export type {
  BaseSettingsProps,
  SettingsModalProps,
  SettingsPosition,
  SettingsStore,
  SettingsStoreInput,
  SettingsStoreInstance,
} from "./settings/settingsStore";
export type { BrowserRegion } from "./utils/region";
