import type { ComponentType } from "react";

// Genomic interval passed to track fetchers and renderers.
// TO BE REMOVED
export type BrowserRegion = {
  chromosome: string;
  start: number;
  end: number;
};

// Browser-owned track state shared by every track instance.
export type TrackBase = {
  id: string;
  title: string;
  display: string;
  height: number;
  color?: string;
};

// Callback for renderer-produced interaction items.
export type TrackInteractionCallback<InteractionItem> = {
  callback(item: InteractionItem): void;
}["callback"];

// Tooltip UI for renderer-produced interaction items.
export type TrackTooltipComponent<InteractionItem> = ComponentType<{
  item: InteractionItem;
}>;

// Optional interaction behavior for a track instance.
export type TrackInteraction<InteractionItem = unknown> = {
  onClick?: TrackInteractionCallback<InteractionItem>;
  onHover?: TrackInteractionCallback<InteractionItem>;
  onLeave?: TrackInteractionCallback<InteractionItem>;
  tooltip?: TrackTooltipComponent<InteractionItem>;
};

// Full browser/store shape for one track instance.
export type TrackInstance<Config, InteractionItem = unknown> = {
  type: string;
  base: TrackBase;
  config: Config;
  interaction?: TrackInteraction<InteractionItem>;
};

// Arguments passed to a track fetch function.
export type TrackFetchContext<Config> = {
  config: Config;
  region: BrowserRegion;
};

// Fetch function signature for loading data for one track and region.
export type TrackFetch<Config, Data> = (
  context: TrackFetchContext<Config>,
) => Promise<Data>;

/**
 * Props passed to a track renderer for one display mode.
 */
export type TrackRendererProps<Config, Data> = {
  id: string;
  config: Config;
  color?: string;
  data: Data;
  region: BrowserRegion;
  width: number;
  height: number;
};

/**
 * React component type for a track renderer.
 */
export type TrackRenderer<Config, Data> = ComponentType<
  TrackRendererProps<Config, Data>
>;

// Props passed to a module-owned settings component.
export type TrackSettingsProps<Config> = {
  config: Config;
  updateConfig: (partial: Partial<Config>) => void;
};

// React component type for module-owned settings UI.
export type TrackSettingsComponent<Config> = ComponentType<
  TrackSettingsProps<Config>
>;
