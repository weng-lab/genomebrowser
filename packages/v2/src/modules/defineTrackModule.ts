import { z } from "zod";
import { parsePublicInput } from "./schemas";
import type {
  TrackFetch,
  TrackCreateInput,
  TrackInteraction,
  TrackInteractionCallback,
  TrackModule,
  TrackRenderer,
  TrackSettingsComponent,
  TrackTooltipComponent,
} from "./types";

type TrackConfigSchema = z.ZodObject;
type FetchData<Fetch> =
  Fetch extends TrackFetch<infer _Config, infer Data> ? Data : never;

type ModuleDefaults<ConfigSchema extends TrackConfigSchema> = {
  display?: string;
  height?: number;
  color?: string;
  config?: Partial<z.input<ConfigSchema>>;
};

type RendererMap<Config, Data, Renderers> = {
  [Display in keyof Renderers]: TrackRenderer<Config, Data>;
};

type ValidateRenderers<Config, Data, Renderers> =
  Renderers extends RendererMap<Config, Data, Renderers>
    ? unknown
    : { render: RendererMap<Config, Data, Renderers> };

type TrackModuleDefinition<
  Type extends string,
  ConfigSchema extends TrackConfigSchema,
  Fetch extends TrackFetch<z.output<ConfigSchema>, unknown>,
  Renderers extends object,
  Item,
> = {
  type: Type;
  defaults?: ModuleDefaults<ConfigSchema>;
  configSchema: ConfigSchema;
  fetch: Fetch;
  render: Renderers;
  settingsComponent?: TrackSettingsComponent<z.output<ConfigSchema>>;
  tooltipComponent?: TrackTooltipComponent<Item, z.output<ConfigSchema>>;
} & ValidateRenderers<z.output<ConfigSchema>, FetchData<Fetch>, Renderers>;

const instanceBaseSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  display: z.string().min(1),
  height: z.number().positive(),
  color: z.string().optional(),
});

const interactionCallbackSchema = z.custom<TrackInteractionCallback<unknown>>(
  (value) => typeof value === "function",
  {
    error: "Input must be a function",
  },
);

const interactionSchema = z.strictObject({
  onClick: interactionCallbackSchema.optional(),
  onHover: interactionCallbackSchema.optional(),
  onLeave: interactionCallbackSchema.optional(),
});

export function defineTrackModule<Item = unknown>(): <
  const Type extends string,
  ConfigSchema extends TrackConfigSchema,
  Fetch extends TrackFetch<z.output<ConfigSchema>, unknown>,
  const Renderers extends object,
>(
  definition: TrackModuleDefinition<Type, ConfigSchema, Fetch, Renderers, Item>,
) => TrackModule<Type, ConfigSchema, FetchData<Fetch>, Item>;
export function defineTrackModule<
  const Type extends string,
  ConfigSchema extends TrackConfigSchema,
  Fetch extends TrackFetch<z.output<ConfigSchema>, unknown>,
  const Renderers extends object,
>(
  definition: TrackModuleDefinition<
    Type,
    ConfigSchema,
    Fetch,
    Renderers,
    unknown
  >,
): TrackModule<Type, ConfigSchema, FetchData<Fetch>, unknown>;
export function defineTrackModule(
  definition?: TrackModuleDefinition<
    string,
    TrackConfigSchema,
    TrackFetch<unknown, unknown>,
    object,
    unknown
  >,
): unknown {
  if (definition === undefined) return createTrackModule;
  return createTrackModule(definition);
}

function createTrackModule<
  const Type extends string,
  ConfigSchema extends TrackConfigSchema,
  Fetch extends TrackFetch<z.output<ConfigSchema>, unknown>,
  const Renderers extends object,
  Item,
>(
  definition: TrackModuleDefinition<Type, ConfigSchema, Fetch, Renderers, Item>,
) {
  const configSchema = definition.configSchema.strict();
  const displays = Object.keys(definition.render);
  assertDisplayModes(definition.type, displays);

  const defaultDisplay = definition.defaults?.display ?? displays[0];
  if (!displays.includes(defaultDisplay)) {
    throw new Error(
      `Track module "${definition.type}" default display "${defaultDisplay}" is not supported`,
    );
  }

  const displaySchema = z.enum(displays as [string, ...string[]]);
  const fullBaseSchema = instanceBaseSchema.extend({ display: displaySchema }).strict();
  const createInputSchema = z.strictObject({
    id: z.string().min(1),
    title: z.string().min(1),
    display: displaySchema.default(defaultDisplay),
    height: z.number().positive().default(definition.defaults?.height ?? 80),
    color: z.string().optional(),
    config: configSchema,
  });

  const instanceSchema = z.strictObject({
    type: z.literal(definition.type),
    base: fullBaseSchema,
    config: configSchema,
    interaction: interactionSchema.optional(),
  });

  return {
    type: definition.type,
    displays,
    configSchema,
    createInputSchema,
    create(
      input: TrackCreateInput<z.input<ConfigSchema>>,
      interaction?: TrackInteraction<Item>,
    ) {
      const inputConfig = input?.config;
      const merged = isRecord(input) && isRecord(inputConfig)
        ? {
            ...input,
            config: { ...definition.defaults?.config, ...inputConfig },
          }
        : input;
      const parsed = parsePublicInput(createInputSchema, merged, `${definition.type} input`);
      const parsedInteraction = interaction !== undefined
        ? parsePublicInput(
            interactionSchema,
            interaction,
            `${definition.type} interaction`,
          )
        : undefined;
      return {
        type: definition.type,
        base: {
          id: parsed.id,
          title: parsed.title,
          display: parsed.display,
          height: parsed.height,
          color: parsed.color ?? definition.defaults?.color,
        },
        config: parsed.config,
        ...(parsedInteraction ? { interaction: parsedInteraction } : {}),
      };
    },
    validate(instance: unknown) {
      return parsePublicInput(
        instanceSchema,
        instance,
        `${definition.type} instance`,
      );
    },
    fetch: definition.fetch,
    render: definition.render,
    settingsComponent: definition.settingsComponent,
    tooltipComponent: definition.tooltipComponent,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertDisplayModes(type: string, displays: string[]) {
  if (displays.length === 0) {
    throw new Error(`Track module "${type}" must define at least one renderer`);
  }

  for (const display of displays) {
    if (display.trim() === "") {
      throw new Error(
        `Track module "${type}" cannot define an empty display mode`,
      );
    }
  }
}
