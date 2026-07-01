import type { ComponentType } from "react";
import type { z } from "zod";
import type { BrowserRegion } from "./utils/region";

export type TrackBase = {
  id: string;
  title: string;
  display: string;
  height: number;
  color?: string;
};

export type TrackInteractionCallback<InteractionItem> = (item: InteractionItem) => void;

export type TrackInteraction<InteractionItem = unknown> = {
  onClick?: TrackInteractionCallback<InteractionItem>;
  onHover?: TrackInteractionCallback<InteractionItem>;
  onLeave?: TrackInteractionCallback<InteractionItem>;
};

export type TrackInstance<Config, InteractionItem = unknown> = {
  type: string;
  base: TrackBase;
  config: Config;
  interaction?: TrackInteraction<InteractionItem>;
};

export type TrackFetchContext<Config> = {
  config: Config;
  region: BrowserRegion;
};

export type TrackFetch<Config, Data> = (context: TrackFetchContext<Config>) => Promise<Data>;

export type TrackRendererProps<Config, Data> = {
  id: string;
  config: Config;
  color?: string;
  data: Data;
  region: BrowserRegion;
  width: number;
  height: number;
};

export type TrackRenderer<Config, Data> = ComponentType<TrackRendererProps<Config, Data>>;

export type TrackMutationResult = { ok: true } | { ok: false; error: string };

export type TrackSettingsProps<Config> = {
  id: string;
  config: Config;
  updateConfig: (partial: Partial<Config>) => TrackMutationResult;
};

export type TrackSettingsComponent<Config> = ComponentType<TrackSettingsProps<Config>>;

export type TrackTooltipComponent<Item, Config> = ComponentType<{
  item: Item;
  config: Config;
}>;

export type TrackModule<Config, Data, Item = unknown> = {
  type: string;
  displays: string[];
  configSchema: z.ZodType<Config>;
  createInputSchema: z.ZodType<unknown>;
  create(input: unknown): TrackInstance<Config, Item>;
  validate(instance: unknown): TrackInstance<Config, Item>;
  fetch: TrackFetch<Config, Data>;
  render: Record<string, TrackRenderer<Config, Data>>;
  settingsComponent?: TrackSettingsComponent<Config>;
  tooltipComponent?: TrackTooltipComponent<Item, Config>;
};

export type AnyTrackModule = TrackModule<any, any, any>;
