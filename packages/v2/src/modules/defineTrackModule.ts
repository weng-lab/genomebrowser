import { z } from "zod";
import { parsePublicInput } from "./schemas";
import type {
  TrackFetch,
  TrackInstance,
  TrackInteraction,
  TrackInteractionCallback,
  TrackModule,
  TrackRenderer,
  TrackSettingsComponent,
  TrackTooltipComponent,
} from "./types";

type TrackConfigSchema = z.ZodObject;
type FetchData<Fetch> = Fetch extends TrackFetch<any, infer Data> ? Data : never;
type DisplayKey<Renderers> = Extract<keyof Renderers, string>;
type DefinedTrackInstance<Type extends string, Config, Item> = TrackInstance<Config, Item> & {
  type: Type;
};

type ModuleDefaults<ConfigSchema extends TrackConfigSchema, Display extends string> = {
  display?: Display;
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
  Fetch extends TrackFetch<z.output<ConfigSchema>, any>,
  Renderers extends object,
  Item,
> = {
  type: Type;
  defaults?: ModuleDefaults<ConfigSchema, DisplayKey<Renderers>>;
  configSchema: ConfigSchema;
  fetch: Fetch;
  render: Renderers;
  settingsComponent?: TrackSettingsComponent<z.output<ConfigSchema>>;
  tooltipComponent?: TrackTooltipComponent<Item, z.output<ConfigSchema>>;
} & ValidateRenderers<z.output<ConfigSchema>, FetchData<Fetch>, Renderers>;

const baseSchema = z.strictObject({
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
  Fetch extends TrackFetch<z.output<ConfigSchema>, any>,
  const Renderers extends object,
>(
  definition: TrackModuleDefinition<Type, ConfigSchema, Fetch, Renderers, Item>,
) => TrackModule<z.output<ConfigSchema>, FetchData<Fetch>, Item> & {
  type: Type;
  displays: Array<DisplayKey<Renderers>>;
  render: Renderers;
  create(
    input: FlatCreateInput<ConfigSchema, DisplayKey<Renderers>, Item>,
  ): DefinedTrackInstance<Type, z.output<ConfigSchema>, Item>;
  validate(instance: unknown): DefinedTrackInstance<Type, z.output<ConfigSchema>, Item>;
};
export function defineTrackModule<
  const Type extends string,
  ConfigSchema extends TrackConfigSchema,
  Fetch extends TrackFetch<z.output<ConfigSchema>, any>,
  const Renderers extends object,
>(
  definition: TrackModuleDefinition<Type, ConfigSchema, Fetch, Renderers, unknown>,
): TrackModule<z.output<ConfigSchema>, FetchData<Fetch>, unknown> & {
  type: Type;
  displays: Array<DisplayKey<Renderers>>;
  render: Renderers;
  create(
    input: FlatCreateInput<ConfigSchema, DisplayKey<Renderers>, unknown>,
  ): DefinedTrackInstance<Type, z.output<ConfigSchema>, unknown>;
  validate(instance: unknown): DefinedTrackInstance<Type, z.output<ConfigSchema>, unknown>;
};
export function defineTrackModule(definition?: any): any {
  if (definition === undefined) return createTrackModule;
  return createTrackModule(definition as never);
}

type FlatCreateInput<
  ConfigSchema extends TrackConfigSchema,
  Display extends string,
  Item,
> = z.input<ConfigSchema> & {
  id: string;
  title: string;
  display?: Display;
  height?: number;
  color?: string;
} & Partial<TrackInteraction<Item>>;

function createTrackModule<
  const Type extends string,
  ConfigSchema extends TrackConfigSchema,
  Fetch extends TrackFetch<z.output<ConfigSchema>, any>,
  const Renderers extends object,
  Item,
>(definition: TrackModuleDefinition<Type, ConfigSchema, Fetch, Renderers, Item>) {
  const configSchema = definition.configSchema.strict() as ConfigSchema;
  assertNoReservedConfigFields(definition.type, configSchema);

  const displays = Object.keys(definition.render as object) as Array<DisplayKey<Renderers>>;
  assertDisplayModes(definition.type, displays);

  const defaultDisplay = definition.defaults?.display ?? displays[0];
  if (!displays.includes(defaultDisplay)) {
    throw new Error(
      `Track module "${definition.type}" default display "${defaultDisplay}" is not supported`,
    );
  }

  const displaySchema = z.enum(displays as unknown as [string, ...string[]]);
  const fullBaseSchema = baseSchema.extend({ display: displaySchema }).strict();
  const createBaseSchema = baseSchema
    .extend({
      display: displaySchema.default(defaultDisplay),
      height: z
        .number()
        .positive()
        .default(definition.defaults?.height ?? 80),
      color:
        definition.defaults?.color === undefined
          ? z.string().optional()
          : z.string().default(definition.defaults.color),
    })
    .strict();

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
    create(input: FlatCreateInput<ConfigSchema, DisplayKey<Renderers>, Item>) {
      const partitioned = partitionCreateInput(definition.type, configSchema, input);
      const base = parsePublicInput(createBaseSchema, partitioned.base, `${definition.type} base`);
      const config = parsePublicInput(
        configSchema,
        { ...definition.defaults?.config, ...partitioned.config },
        `${definition.type} config`,
      );
      const interaction = partitioned.interaction
        ? parsePublicInput(
            interactionSchema,
            partitioned.interaction,
            `${definition.type} interaction`,
          )
        : undefined;
      const instance = {
        type: definition.type,
        base,
        config,
        ...(interaction ? { interaction } : {}),
      };

      return parsePublicInput(instanceSchema, instance, `${definition.type} instance`) as never;
    },
    validate(instance: unknown) {
      return parsePublicInput(instanceSchema, instance, `${definition.type} instance`) as never;
    },
    fetch: definition.fetch,
    render: definition.render,
    settingsComponent: definition.settingsComponent,
    tooltipComponent: definition.tooltipComponent,
  };
}

function partitionCreateInput(type: string, configSchema: TrackConfigSchema, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`${type} input is invalid: input: Input must be an object`);
  }

  const values = input as Record<string, unknown>;
  const configFields = new Set(Object.keys(configSchema.shape));
  const baseFields = new Set(["id", "title", "display", "height", "color"]);
  const interactionFields = new Set(["onClick", "onHover", "onLeave"]);
  const base: Record<string, unknown> = {};
  const config: Record<string, unknown> = {};
  const interaction: Record<string, unknown> = {};

  for (const [field, value] of Object.entries(values)) {
    if (baseFields.has(field)) {
      base[field] = value;
    } else if (interactionFields.has(field)) {
      interaction[field] = value;
    } else if (configFields.has(field)) {
      config[field] = value;
    } else {
      throw new Error(`${type} input is invalid: ${field}: Unrecognized key`);
    }
  }

  return {
    base,
    config,
    interaction: Object.keys(interaction).length === 0 ? undefined : interaction,
  };
}

function assertDisplayModes(type: string, displays: string[]) {
  if (displays.length === 0) {
    throw new Error(`Track module "${type}" must define at least one renderer`);
  }

  for (const display of displays) {
    if (display.trim() === "") {
      throw new Error(`Track module "${type}" cannot define an empty display mode`);
    }
  }
}

function assertNoReservedConfigFields(type: string, configSchema: TrackConfigSchema) {
  const reservedFields = new Set([
    "id",
    "type",
    "title",
    "display",
    "height",
    "color",
    "base",
    "config",
    "interaction",
    "onClick",
    "onHover",
    "onLeave",
    "tooltip",
  ]);

  for (const field of Object.keys(configSchema.shape)) {
    if (reservedFields.has(field)) {
      throw new Error(`Track config schema for "${type}" cannot define reserved field "${field}"`);
    }
  }
}
