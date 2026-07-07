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

export type TrackCreateInput<ConfigInput> = {
  id: string;
  title: string;
  display?: string;
  height?: number;
  color?: string;
  config: ConfigInput;
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

export type TrackCreateInputSchema<ConfigSchema extends z.ZodObject> =
  z.ZodObject<
    {
      id: z.ZodString;
      title: z.ZodString;
      display: z.ZodDefault<z.ZodType<string, string>>;
      height: z.ZodDefault<z.ZodNumber>;
      color: z.ZodOptional<z.ZodString>;
      config: ConfigSchema;
    },
    z.core.$strict
  >;

export type TrackModule<
  Type extends string,
  ConfigSchema extends z.ZodObject,
  Data,
  Item = unknown,
> = {
  type: Type;
  displays: string[];
  configSchema: ConfigSchema;
  createInputSchema: TrackCreateInputSchema<ConfigSchema>;
  create(
    input: TrackCreateInput<z.input<ConfigSchema>>,
    interaction?: TrackInteraction<Item>,
  ): TrackInstance<z.output<ConfigSchema>, Item> & { type: Type };
  validate(
    instance: unknown,
  ): TrackInstance<z.output<ConfigSchema>, Item> & { type: Type };
  fetch: TrackFetch<z.output<ConfigSchema>, Data>;
  render: Record<string, TrackRenderer<z.output<ConfigSchema>, Data>>;
  settingsComponent?: TrackSettingsComponent<z.output<ConfigSchema>>;
  tooltipComponent?: TrackTooltipComponent<Item, z.output<ConfigSchema>>;
};

export type AnyTrackModule = {
  type: string;
  displays: string[];
  configSchema: z.ZodObject;
  createInputSchema: TrackCreateInputSchema<z.ZodObject>;
  create(
    input: unknown,
    interaction?: unknown,
  ): AnyTrackInstance;
  validate(instance: unknown): AnyTrackInstance;
  fetch: unknown;
  render: Record<string, unknown>;
  settingsComponent?: unknown;
  tooltipComponent?: unknown;
};
export type AnyTrackInstance = TrackInstance<unknown, never> & {
  type: string;
};
export type ModuleCreateInput<M extends AnyTrackModule> = z.input<
  M["createInputSchema"]
>;
export type ModuleInstance<M extends AnyTrackModule> = M extends AnyTrackModule
  ? ReturnType<M["validate"]>
  : never;
