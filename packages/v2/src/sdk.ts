export { createModuleRegistry } from "./modules/registry";
export { defineTrackModule } from "./modules/defineTrackModule";
export { browserRegionSchema, formatLength, parseRegion, regionLength } from "./utils/region";
export { createReverseXScale, createXScale } from "./utils/scale";
export { svgPoint } from "./utils/svg";
export { useInteraction } from "./hooks/useInteraction";

export type {
  AnyTrackModule,
  TrackConfigBase,
  TrackDataState,
  TrackFetchContext,
  TrackInteractionCallback,
  TrackInteractionConfig,
  TrackInteractionContext,
  TrackModule,
  TrackRendererProps,
  TrackSettingsProps,
  TrackTooltipComponent,
  TrackTooltipProps,
} from "./modules/types";
export type { BrowserRegion } from "./utils/region";
