import type { MutationFailure } from "../mutation";
import type { ComponentType } from "react";
import type { z } from "zod";
import type { trackBaseSchema, trackSourceSchema } from "../schemas";
import type { AssemblyDefinition } from "../genome/assembly";
import type { GenomicRegion } from "../genome/region";

export type TrackBase = z.output<typeof trackBaseSchema>;
export type TrackBaseInput<Display extends string = string> = z.input<
  TrackCreateInputSchema<z.ZodObject, Display>
>["base"];

export type TrackSource = z.output<typeof trackSourceSchema>;

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
  base: TrackBaseInput<Display>;
  source?: TrackSource;
  config: ConfigInput;
};

export type TrackInstance<Config, InteractionItem = unknown> = {
  type: string;
  base: TrackBase;
  config: Config;
  source: TrackSource;
  interaction?: TrackInteraction<InteractionItem, Config>;
};

export type TrackFetchTrack<Config> = Readonly<{
  base: Readonly<Pick<TrackBase, "id" | "display">>;
  type: string;
  config: Config extends object ? Readonly<Config> : Config;
}>;

export type TrackFetchDemand = Readonly<{
  /** Viewport is within the browser cutoff, independent of the width guard. */
  basePairDetail: boolean;
  assembly: AssemblyDefinition;
  region: Readonly<GenomicRegion>;
  visibleRegion: Readonly<GenomicRegion>;
  width: number;
}>;

/**
 * Storage for fetcher-owned values that persist across fetches for the
 * lifetime of one track in one mounted browser. Keys are local to the calling
 * track; core scopes them by browser instance, track type, and track ID.
 * Values are never inspected or evicted by core. Removing the track or
 * unmounting the browser releases every stored value.
 */
export type TrackResources = Readonly<{
  get<T>(key: string): T | undefined;
  set(key: string, value: unknown): void;
  delete(key: string): void;
  clear(): void;
}>;

export type TrackFetchContext<Config> = Readonly<{
  track: TrackFetchTrack<Config>;
  demand: TrackFetchDemand;
  resources: TrackResources;
  /**
   * Aborts when the browser no longer needs this request, such as after the
   * view moves again or the track is removed. Pass it to reader calls so
   * superseded downloads stop. The browser ignores results of aborted requests.
   */
  signal?: AbortSignal;
}>;

export type TrackFetch<Config, Data> = (context: TrackFetchContext<Config>) => Promise<Data>;

export type TrackRendererProps<Config, Data> = {
  id: string;
  config: Config;
  color: string;
  data: Data;
  visibleRegion: GenomicRegion;
  region: GenomicRegion;
  width: number;
  height: number;
};

export type TrackRenderer<Config, Data> = ComponentType<TrackRendererProps<Config, Data>>;

export type TrackMutationErrorCode =
  | "INVALID_TRACK"
  | "UNKNOWN_TRACK_MODULE"
  | "DUPLICATE_TRACK_ID"
  | "TRACK_NOT_FOUND"
  | "INVALID_TRACK_ORDER";

export type TrackMutationResult = { ok: true } | MutationFailure<TrackMutationErrorCode>;

/** A track mutation made through hosted browser controls, rejected while interaction is blocked. */
export type TrackSettingsMutationResult =
  | TrackMutationResult
  | MutationFailure<"INTERACTION_BLOCKED">;

export type TrackBaseUpdate = Partial<Omit<TrackBase, "id">>;

export type TrackUpdate<Config, InteractionItem = unknown> = {
  base?: TrackBaseUpdate;
  config?: Partial<Config>;
  interaction?: Partial<TrackInteraction<InteractionItem, Config>>;
};

/** Computes a patch from the latest stored track, so several updates in one event compose. */
export type TrackUpdater<Config, InteractionItem = unknown> = (
  track: ReadonlyTrackInstance<Config, InteractionItem>,
) => TrackUpdate<Config, InteractionItem>;

export type ReadonlyTrackInstance<Config, InteractionItem = unknown> = Readonly<{
  type: string;
  base: Readonly<TrackBase>;
  config: Config extends object ? Readonly<Config> : Config;
  source: TrackSource;
  interaction?: Readonly<TrackInteraction<InteractionItem, Config>>;
}>;

export type TrackSettingsProps<Config, InteractionItem = unknown> = {
  track: ReadonlyTrackInstance<Config, InteractionItem>;
  displayOptions: readonly string[];
  updateTracksOfType: (
    createUpdate: TrackUpdater<Config, InteractionItem>,
  ) => TrackSettingsMutationResult;
  updateTrack: (
    update: TrackUpdate<Config, InteractionItem> | TrackUpdater<Config, InteractionItem>,
  ) => TrackSettingsMutationResult;
};

export type TrackSettingsComponent<Config, InteractionItem = unknown> = ComponentType<
  TrackSettingsProps<Config, InteractionItem>
>;

export type TrackTooltipComponent<Item, Config> = ComponentType<{
  item: Item;
  context: TrackRuntimeContext<Config>;
}>;

export type AnyTrackTooltipComponent = TrackTooltipComponent<never, never>;

type TrackBaseShape = (typeof trackBaseSchema)["shape"];

export type TrackCreateInputSchema<
  ConfigSchema extends z.ZodObject,
  Display extends string = string,
> = z.ZodObject<
  {
    base: z.ZodObject<
      Omit<TrackBaseShape, "display" | "height" | "color"> & {
        display: z.ZodDefault<z.ZodType<Display, Display>>;
        height: z.ZodDefault<TrackBaseShape["height"]>;
        color: z.ZodDefault<TrackBaseShape["color"]>;
      },
      z.core.$strict
    >;
    source: z.ZodDefault<typeof trackSourceSchema>;
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
  /** Marks a coordinate ruler that can accompany track image downloads. */
  isRuler?: boolean;
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
  isRuler?: boolean;
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
  source: TrackSource;
  interaction?: AnyTrackInteraction;
};
export type ModuleCreateInput<M extends AnyTrackModule> = z.input<M["createInputSchema"]>;
export type ModuleInstance<M extends AnyTrackModule> = M extends AnyTrackModule
  ? ReturnType<M["validate"]>
  : never;
