import type { ComponentType } from "react";
import type { z } from "zod";
import type { GenomicRegion } from "../genome/region";

export type TrackBase = {
  id: string;
  title: string;
  display: string;
  height: number;
  color: string;
};

export type TrackRuntimeContext<Config = unknown> = Readonly<{
  type: string;
  base: Readonly<TrackBase>;
  config: Config extends object ? Readonly<Config> : Config;
}>;

export type TrackInteractionCallback<InteractionItem, Config = unknown> = (
  item: InteractionItem,
  context: TrackRuntimeContext<Config>,
) => void;

export type TrackInteraction<InteractionItem = unknown, Config = unknown> = {
  onClick?: TrackInteractionCallback<InteractionItem, Config>;
  onHover?: TrackInteractionCallback<InteractionItem, Config>;
  onLeave?: TrackInteractionCallback<InteractionItem, Config>;
};

export type TrackRendererInteraction<InteractionItem> = {
  onClick?: (item: InteractionItem) => void;
  onHover?: (item: InteractionItem) => void;
  onLeave?: (item: InteractionItem) => void;
};

export type AnyTrackInteraction = TrackInteraction<never, never>;

export type TrackCreateInput<ConfigInput, Display extends string = string> = {
  id: string;
  title: string;
  display?: Display;
  height?: number;
  color?: string;
  config: ConfigInput;
};

export type TrackInstance<Config, InteractionItem = unknown> = {
  type: string;
  base: TrackBase;
  config: Config;
  interaction?: TrackInteraction<InteractionItem, Config>;
};

export type TrackFetchContext<Config> = {
  config: Config;
  region: GenomicRegion;
};

export type TrackFetch<Config, Data> = (context: TrackFetchContext<Config>) => Promise<Data>;

export type TrackRendererProps<Config, Data> = {
  id: string;
  config: Config;
  color: string;
  data: Data;
  region: GenomicRegion;
  width: number;
  height: number;
};

export type TrackRenderer<Config, Data> = ComponentType<TrackRendererProps<Config, Data>>;

export type TrackMutationResult = { ok: true } | { ok: false; error: string };

export type TrackBaseUpdate = Partial<Omit<TrackBase, "id">>;

export type TrackUpdate<Config, InteractionItem = unknown> = {
  base?: TrackBaseUpdate;
  config?: Partial<Config>;
  interaction?: Partial<TrackInteraction<InteractionItem, Config>>;
};

export type ReadonlyTrackInstance<Config, InteractionItem = unknown> = Readonly<{
  type: string;
  base: Readonly<TrackBase>;
  config: Config extends object ? Readonly<Config> : Config;
  interaction?: Readonly<TrackInteraction<InteractionItem, Config>>;
}>;

export type TrackSettingsProps<Config, InteractionItem = unknown> = {
  track: ReadonlyTrackInstance<Config, InteractionItem>;
  updateTrack: (update: TrackUpdate<Config, InteractionItem>) => TrackMutationResult;
};

export type TrackSettingsComponent<Config, InteractionItem = unknown> = ComponentType<
  TrackSettingsProps<Config, InteractionItem>
>;

export type TrackTooltipComponent<Item, Config> = ComponentType<{
  item: Item;
  context: TrackRuntimeContext<Config>;
}>;

export type AnyTrackTooltipComponent = TrackTooltipComponent<never, never>;

export type TrackCreateInputSchema<
  ConfigSchema extends z.ZodObject,
  Display extends string = string,
> = z.ZodObject<
  {
    id: z.ZodString;
    title: z.ZodString;
    display: z.ZodDefault<z.ZodType<Display, Display>>;
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
  Display extends string = string,
> = {
  type: Type;
  displays: Display[];
  configSchema: ConfigSchema;
  createInputSchema: TrackCreateInputSchema<ConfigSchema, Display>;
  create(
    input: TrackCreateInput<z.input<ConfigSchema>, Display>,
    interaction?: TrackInteraction<Item, z.output<ConfigSchema>>,
  ): TrackInstance<z.output<ConfigSchema>, Item> & { type: Type };
  validate(instance: unknown): TrackInstance<z.output<ConfigSchema>, Item> & { type: Type };
  fetch: TrackFetch<z.output<ConfigSchema>, Data>;
  render: Record<string, TrackRenderer<z.output<ConfigSchema>, Data>>;
  settingsComponent?: TrackSettingsComponent<z.output<ConfigSchema>, Item>;
  tooltipComponent?: TrackTooltipComponent<Item, z.output<ConfigSchema>>;
};

export type AnyTrackModule = {
  type: string;
  displays: string[];
  configSchema: z.ZodObject;
  createInputSchema: TrackCreateInputSchema<z.ZodObject, string>;
  create(input: unknown, interaction?: AnyTrackInteraction): AnyTrackInstance;
  validate(instance: unknown): AnyTrackInstance;
  fetch: unknown;
  render: Record<string, unknown>;
  settingsComponent?: unknown;
  tooltipComponent?: unknown;
};
export type AnyTrackInstance = {
  type: string;
  base: TrackBase;
  config: Record<string, unknown>;
  interaction?: AnyTrackInteraction;
};
export type ModuleCreateInput<M extends AnyTrackModule> = z.input<M["createInputSchema"]>;
export type ModuleInstance<M extends AnyTrackModule> = M extends AnyTrackModule
  ? ReturnType<M["validate"]>
  : never;
