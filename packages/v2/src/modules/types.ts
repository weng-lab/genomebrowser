import type { ComponentType, MouseEvent } from "react";
import type { BrowserRegion } from "./utils/region";

export type TrackInteractionContext<Item, Config extends TrackConfigBase> = {
  item: Item;
  config: Config;
  event: MouseEvent;
};

export type TrackInteractionCallback<Item, Config extends TrackConfigBase> = (
  context: TrackInteractionContext<Item, Config>,
) => void;

export type TrackTooltipProps<Item, Config extends TrackConfigBase> = {
  item: Item;
  config: Config;
};

export type TrackTooltipComponent<Item, Config extends TrackConfigBase> = ComponentType<
  TrackTooltipProps<Item, Config>
>;

export type TrackInteractionConfig<Item, Config extends TrackConfigBase> = {
  onClick?: TrackInteractionCallback<Item, Config>;
  onHover?: TrackInteractionCallback<Item, Config>;
  onLeave?: TrackInteractionCallback<Item, Config>;
  tooltip?: TrackTooltipComponent<Item, Config>;
};

export type TrackConfigBase = {
  id: string;
  type: string;
  title: string;
  display: string;
  height: number;
  color?: string;
  onClick?: TrackInteractionCallback<any, any>;
  onHover?: TrackInteractionCallback<any, any>;
  onLeave?: TrackInteractionCallback<any, any>;
  tooltip?: TrackTooltipComponent<any, any>;
};

export type TrackFetchContext<Config extends TrackConfigBase> = {
  config: Config;
  region: BrowserRegion;
};

export type TrackRendererProps<Config extends TrackConfigBase, Data> = {
  config: Config;
  data: Data;
  region: BrowserRegion;
  width: number;
  height: number;
};

export type TrackSettingsUpdate<Config extends TrackConfigBase> = Partial<
  Omit<Config, "id" | "type">
>;

export type TrackMutationResult = { ok: true } | { ok: false; error: string };

export type TrackSettingsProps<Config extends TrackConfigBase> = {
  config: Config;
  updateTrack: (partial: TrackSettingsUpdate<Config>) => TrackMutationResult;
};

export type TrackModule<Config extends TrackConfigBase, Data, Input = unknown> = {
  type: Config["type"];
  create(input: Input): Config;
  validate(config: unknown): Config;
  fetch(ctx: TrackFetchContext<Config>): Promise<Data>;
  render: Record<string, ComponentType<TrackRendererProps<Config, Data>>>;
  settingsComponent?: ComponentType<TrackSettingsProps<Config>>;
};

export type AnyTrackModule = TrackModule<any, any, any>;
