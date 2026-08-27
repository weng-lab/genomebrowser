import { z } from "zod";
import { hexColorSchema, parsePublicInput } from "./schemas";
import type {
  TrackFetch,
  TrackCreateInput,
  TrackCreateInputSchema,
  TrackInteraction,
  TrackInteractionCallback,
  TrackModule,
  TrackRenderer,
  TrackSettingsComponent,
  TrackTooltipComponent,
} from "./types";

type TrackConfigSchema = z.ZodObject;
type FetchData<Fetch> = Fetch extends TrackFetch<infer _Config, infer Data> ? Data : never;
type DisplayKey<Renderers> = Extract<keyof Renderers, string>;
type ParsedCreateInput<ConfigSchema extends TrackConfigSchema, Display extends string> = {
  id: string;
  title: string;
  display: Display;
  height: number;
  color?: string;
  settingsPolicy: "editable" | "managed";
  config: z.output<ConfigSchema>;
};

type ModuleDefaults<Display extends string> = {
  display?: Display;
  height?: number;
  color?: string;
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
  defaults?: ModuleDefaults<DisplayKey<Renderers>>;
  configSchema: ConfigSchema;
  fetch: Fetch;
  render: Renderers;
  settingsComponent?: TrackSettingsComponent<z.output<ConfigSchema>, Item>;
  tooltipComponent?: TrackTooltipComponent<Item, z.output<ConfigSchema>>;
} & ValidateRenderers<z.output<ConfigSchema>, FetchData<Fetch>, Renderers>;

const instanceBaseSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  display: z.string().min(1),
  height: z.number().positive(),
  color: hexColorSchema,
});

const interactionCallbackSchema = z.custom<TrackInteractionCallback<unknown, unknown>>(
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
) => TrackModule<Type, ConfigSchema, FetchData<Fetch>, Item, DisplayKey<Renderers>>;
export function defineTrackModule<
  const Type extends string,
  ConfigSchema extends TrackConfigSchema,
  Fetch extends TrackFetch<z.output<ConfigSchema>, unknown>,
  const Renderers extends object,
>(
  definition: TrackModuleDefinition<Type, ConfigSchema, Fetch, Renderers, unknown>,
): TrackModule<Type, ConfigSchema, FetchData<Fetch>, unknown, DisplayKey<Renderers>>;
export function defineTrackModule(
  definition?: TrackModuleDefinition<
    string,
    TrackConfigSchema,
    TrackFetch<unknown, unknown>,
    Record<string, TrackRenderer<unknown, unknown>>,
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
>(definition: TrackModuleDefinition<Type, ConfigSchema, Fetch, Renderers, Item>) {
  const configSchema = definition.configSchema.strict() as ConfigSchema;
  const displays = Object.keys(definition.render) as DisplayKey<Renderers>[];
  assertDisplayModes(definition.type, displays);

  const defaultDisplay = definition.defaults?.display ?? displays[0];
  if (!displays.includes(defaultDisplay)) {
    throw new Error(
      `Track module "${definition.type}" default display "${defaultDisplay}" is not supported`,
    );
  }

  const displaySchema = z.enum(
    displays as [DisplayKey<Renderers>, ...Array<DisplayKey<Renderers>>],
  );
  const fullBaseSchema = instanceBaseSchema.extend({ display: displaySchema }).strict();
  const createInputSchema = z.strictObject({
    id: z.string().min(1),
    title: z.string().min(1),
    display: displaySchema.default(defaultDisplay),
    height: z
      .number()
      .positive()
      .default(definition.defaults?.height ?? 80),
    color: hexColorSchema.optional(),
    settingsPolicy: z.enum(["editable", "managed"]).default("editable"),
    config: configSchema,
  }) as TrackCreateInputSchema<ConfigSchema, DisplayKey<Renderers>>;

  const instanceSchema = z.strictObject({
    type: z.literal(definition.type),
    base: fullBaseSchema,
    config: configSchema,
    settingsPolicy: z.enum(["editable", "managed"]),
    interaction: interactionSchema.optional(),
  });
  validateModuleDefaults(definition.type, definition.defaults, defaultDisplay, fullBaseSchema);

  return {
    type: definition.type,
    displays,
    configSchema,
    createInputSchema,
    create(
      input: TrackCreateInput<z.input<ConfigSchema>, DisplayKey<Renderers>>,
      interaction?: TrackInteraction<Item, z.output<ConfigSchema>>,
    ) {
      const parsed = parsePublicInput(
        createInputSchema,
        input,
        `${definition.type} input`,
      ) as ParsedCreateInput<ConfigSchema, DisplayKey<Renderers>>;
      const parsedInteraction =
        interaction !== undefined
          ? parsePublicInput(interactionSchema, interaction, `${definition.type} interaction`)
          : undefined;
      const instance = {
        type: definition.type,
        base: {
          id: parsed.id,
          title: parsed.title,
          display: parsed.display,
          height: parsed.height,
          color: parsed.color ?? definition.defaults?.color ?? "#000000",
        },
        config: parsed.config,
        settingsPolicy: parsed.settingsPolicy,
        ...(parsedInteraction ? { interaction: parsedInteraction } : {}),
      };

      return instance;
    },
    validate(instance: unknown) {
      return parsePublicInput(instanceSchema, instance, `${definition.type} instance`);
    },
    fetch: definition.fetch,
    render: definition.render,
    settingsComponent: definition.settingsComponent,
    tooltipComponent: definition.tooltipComponent,
  };
}

function validateModuleDefaults(
  type: string,
  defaults: ModuleDefaults<string> | undefined,
  defaultDisplay: string,
  baseSchema: z.ZodObject,
) {
  parsePublicInput(
    baseSchema,
    {
      id: "__default_validation__",
      title: "Default validation",
      display: defaultDisplay,
      height: defaults?.height ?? 80,
      color: defaults?.color ?? "#000000",
    },
    `${type} defaults`,
  );
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
