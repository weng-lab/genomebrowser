import type { ComponentType } from "react";
import { z } from "zod";
import { registerFetchSchema } from "./fetchOnChange";
import { functionSchema, parsePublicInput } from "./schemas";
import type {
  TrackInteractionConfig,
  TrackModule,
  TrackRendererProps,
  TrackTooltipComponent,
} from "./types";

type TrackInputSchema = z.ZodObject;
type ReservedTrackField =
  | "id"
  | "type"
  | "title"
  | "display"
  | "height"
  | "color"
  | "onClick"
  | "onHover"
  | "onLeave"
  | "tooltip";
type TrackModuleDefaults<Display extends string, Item> = {
  display?: Display;
  height?: number;
  color?: string;
} & Partial<TrackInteractionConfig<Item, any>>;

type DefinedTrackConfig<
  Type extends string,
  Schema extends TrackInputSchema,
  Display extends string,
  Item,
> = Omit<z.output<Schema>, ReservedTrackField> & {
  id: string;
  type: Type;
  title: string;
  display: Display;
  height: number;
  color?: string;
} & Partial<TrackInteractionConfig<Item, any>>;

type TrackModuleDefinition<
  Type extends string,
  Schema extends TrackInputSchema,
  Display extends string,
  Data,
  Item,
> = {
  type: Type;
  defaults?: TrackModuleDefaults<Display, Item>;
  configSchema: Schema;
  fetch: TrackModule<DefinedTrackConfig<Type, Schema, Display, Item>, Data, Item>["fetch"];
  render: Record<
    Display,
    ComponentType<TrackRendererProps<DefinedTrackConfig<Type, Schema, Display, Item>, Data>>
  >;
  settingsComponent?: TrackModule<
    DefinedTrackConfig<Type, Schema, Display, Item>,
    Data,
    Item
  >["settingsComponent"];
  tooltipComponent?: TrackTooltipComponent<Item, DefinedTrackConfig<Type, Schema, Display, Item>>;
};

export function defineTrackModule<Item = unknown>(): <
  Type extends string,
  Schema extends TrackInputSchema,
  Display extends string,
  Data,
>(
  definition: TrackModuleDefinition<Type, Schema, Display, Data, Item>,
) => TrackModule<DefinedTrackConfig<Type, Schema, Display, Item>, Data, Item>;
export function defineTrackModule<
  Type extends string,
  Schema extends TrackInputSchema,
  Display extends string,
  Data,
>(
  definition: TrackModuleDefinition<Type, Schema, Display, Data, any>,
): TrackModule<DefinedTrackConfig<Type, Schema, Display, any>, Data, any>;
export function defineTrackModule(definition?: unknown) {
  if (definition === undefined) return createTrackModule;
  return createTrackModule(definition as never);
}

function createTrackModule<
  Type extends string,
  Schema extends TrackInputSchema,
  Display extends string,
  Data,
  Item,
>(
  definition: TrackModuleDefinition<Type, Schema, Display, Data, Item>,
): TrackModule<DefinedTrackConfig<Type, Schema, Display, Item>, Data, Item> {
  assertNoReservedFields(definition.type, definition.configSchema);

  const displayModes = Object.keys(definition.render) as Display[];
  if (displayModes.length === 0) {
    throw new Error(`Track module "${definition.type}" must define at least one renderer`);
  }

  const defaultDisplay = definition.defaults?.display ?? displayModes[0];
  if (!displayModes.includes(defaultDisplay)) {
    throw new Error(`Default display "${defaultDisplay}" is not supported by "${definition.type}"`);
  }

  const baseSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    display: z.enum(displayModes as [Display, ...Display[]]).default(defaultDisplay),
    height: z
      .number()
      .positive()
      .default(definition.defaults?.height ?? 80),
    color:
      definition.defaults?.color === undefined
        ? z.string().optional()
        : z.string().default(definition.defaults.color),
    onClick: functionSchema.optional(),
    onHover: functionSchema.optional(),
    onLeave: functionSchema.optional(),
  });
  const publicInputSchema = definition.configSchema.safeExtend(baseSchema.shape).strict();
  const fullConfigSchema = publicInputSchema.safeExtend({
    type: z.literal(definition.type),
  });

  const module: TrackModule<DefinedTrackConfig<Type, Schema, Display, Item>, Data, Item> = {
    type: definition.type as DefinedTrackConfig<Type, Schema, Display, Item>["type"],
    create(input) {
      const parsed = parsePublicInput(publicInputSchema, input, `${definition.type} config`);
      return {
        ...applyInteractionDefaults(parsed, definition.defaults),
        type: definition.type,
      } as DefinedTrackConfig<Type, Schema, Display, Item>;
    },
    validate(config) {
      const parsed = parsePublicInput(fullConfigSchema, config, `${definition.type} config`);
      return applyInteractionDefaults(parsed, definition.defaults) as DefinedTrackConfig<
        Type,
        Schema,
        Display,
        Item
      >;
    },
    fetch: definition.fetch,
    render: definition.render,
    settingsComponent: definition.settingsComponent,
    tooltipComponent: definition.tooltipComponent,
  };

  registerFetchSchema(module, definition.configSchema);

  return module;
}

function applyInteractionDefaults<T extends Partial<TrackInteractionConfig<any, any>>>(
  config: T,
  defaults: Partial<TrackInteractionConfig<any, any>> | undefined,
) {
  if (!defaults) return config;
  return {
    ...config,
    onClick: config.onClick ?? defaults.onClick,
    onHover: config.onHover ?? defaults.onHover,
    onLeave: config.onLeave ?? defaults.onLeave,
  };
}

function assertNoReservedFields(type: string, schema: TrackInputSchema) {
  const reservedFields = new Set<ReservedTrackField>([
    "id",
    "type",
    "title",
    "display",
    "height",
    "color",
    "onClick",
    "onHover",
    "onLeave",
    "tooltip",
  ]);

  for (const field of Object.keys(schema.shape)) {
    if (reservedFields.has(field as ReservedTrackField)) {
      throw new Error(`Track config schema for "${type}" cannot define reserved field "${field}"`);
    }
  }
}
