import { z } from "zod";
import type {
  TrackFetch,
  TrackInstance,
  TrackInteraction,
  TrackInteractionCallback,
  TrackRenderer,
  TrackSettingsComponent,
  TrackTooltipComponent,
} from "./types";

const baseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  display: z.string().min(1),
  height: z.number().positive(),
  color: z.string().optional(),
});

type fetchData<Fetch> = Fetch extends TrackFetch<any, infer Data> ? Data : never;

type displayKey<Renderers> = Extract<keyof Renderers, string>;

type moduleDefaults<ConfigSchema extends z.ZodObject, Display extends string> = {
  base?: {
    display?: Display;
    height?: number;
    color?: string;
  };
  config?: Partial<z.input<ConfigSchema>>;
};

type trackCreateInput<ConfigSchema extends z.ZodObject, Display extends string> = {
  base: {
    id: string;
    title: string;
    display?: Display;
    height?: number;
    color?: string;
  };
  config?: Partial<z.input<ConfigSchema>>;
  interaction?: TrackInteraction;
};

type rendererMap<ConfigSchema extends z.ZodObject, Data, Renderers> = {
  [Display in keyof Renderers]: TrackRenderer<z.output<ConfigSchema>, Data>;
};

type validateRenderers<ConfigSchema extends z.ZodObject, Data, Renderers> =
  Renderers extends rendererMap<ConfigSchema, Data, Renderers>
    ? unknown
    : { render: rendererMap<ConfigSchema, Data, Renderers> };

const interactionCallbackSchema = z.custom<TrackInteractionCallback<unknown>>(
  (value) => typeof value === "function",
  {
    error: "Input must be a function",
  },
);

const tooltipSchema = z.custom<TrackTooltipComponent<unknown>>(
  (value) => typeof value === "function",
  {
    error: "Input must be a component",
  },
);

const interactionSchema = z.object({
  onClick: interactionCallbackSchema.optional(),
  onHover: interactionCallbackSchema.optional(),
  onLeave: interactionCallbackSchema.optional(),
  tooltip: tooltipSchema.optional(),
});

export function defineTrackModule<
  const Type extends string,
  ConfigSchema extends z.ZodObject,
  Fetch extends TrackFetch<z.output<ConfigSchema>, any>,
  const Renderers extends object,
>(
  definition: {
    type: Type;
    configSchema: ConfigSchema;
    defaults?: moduleDefaults<ConfigSchema, displayKey<Renderers>>;
    fetch: Fetch;
    render: Renderers;
    settingsComponent?: TrackSettingsComponent<z.output<ConfigSchema>>;
  } & validateRenderers<ConfigSchema, fetchData<Fetch>, Renderers>,
) {
  assertNoReservedConfigFields(definition.type, definition.configSchema);

  const displays = Object.keys(definition.render as object) as Array<
    displayKey<Renderers>
  >;
  assertDisplayModes(definition.type, displays);

  const defaults = definition.defaults;
  const defaultDisplay = defaults?.base?.display ?? displays[0];
  if (!displays.includes(defaultDisplay)) {
    throw new Error(
      `Track module "${definition.type}" default display "${defaultDisplay}" is not supported`,
    );
  }

  const displaySchema = z.enum(displays as unknown as [string, ...string[]]);
  const fullBaseSchema = baseSchema.extend({
    display: displaySchema,
  });
  const createBaseSchema = baseSchema.extend({
    display: displaySchema.default(defaultDisplay),
    height: z.number().positive().default(defaults?.base?.height ?? 80),
    color:
      defaults?.base?.color === undefined
        ? z.string().optional()
        : z.string().default(defaults.base.color),
  });

  const schema = z.object({
    type: z.literal(definition.type),
    base: fullBaseSchema,
    config: definition.configSchema,
    interaction: interactionSchema.optional(),
  });

  const createSchema = z.object({
    base: createBaseSchema,
    config: definition.configSchema.partial().optional(),
    interaction: interactionSchema.optional(),
  });

  return {
    type: definition.type,
    displays,
    configSchema: definition.configSchema,
    schema,
    create(
      instance: trackCreateInput<ConfigSchema, displayKey<Renderers>>,
    ): TrackInstance<z.output<ConfigSchema>> {
      const parsed = createSchema.parse(instance);
      const config = definition.configSchema.parse({
        ...defaults?.config,
        ...parsed.config,
      });
      return schema.parse({
        type: definition.type,
        base: parsed.base,
        config,
        ...(parsed.interaction ? { interaction: parsed.interaction } : {}),
      }) as TrackInstance<z.output<ConfigSchema>>;
    },
    validate(instance: unknown): TrackInstance<z.output<ConfigSchema>> {
      return schema.parse(instance) as TrackInstance<z.output<ConfigSchema>>;
    },
    fetch: definition.fetch as TrackFetch<z.output<ConfigSchema>, fetchData<Fetch>>,
    render: definition.render as Renderers,
    settingsComponent: definition.settingsComponent,
  };
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

function assertNoReservedConfigFields(type: string, configSchema: z.ZodObject) {
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
      throw new Error(
        `Track config schema for "${type}" cannot define reserved field "${field}"`,
      );
    }
  }
}
