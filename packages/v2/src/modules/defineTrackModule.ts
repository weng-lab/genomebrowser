import type { ComponentType } from "react";
import { z } from "zod";
import { parsePublicInput } from "./schemas";
import type { TrackModule, TrackRendererProps } from "./types";

type TrackInputSchema = z.ZodObject;
type ReservedTrackField = "id" | "type" | "title" | "display" | "height" | "color";
type TrackModuleDefaults<Display extends string> = {
  display?: Display;
  height?: number;
  color?: string;
};

type DefinedTrackInput<
  Schema extends TrackInputSchema,
  Display extends string,
> = z.input<Schema> & {
  id: string;
  title: string;
  display?: Display;
  height?: number;
  color?: string;
};

type DefinedTrackConfig<
  Type extends string,
  Schema extends TrackInputSchema,
  Display extends string,
> = Omit<z.output<Schema>, ReservedTrackField> & {
  id: string;
  type: Type;
  title: string;
  display: Display;
  height: number;
  color?: string;
};

type TrackModuleDefinition<
  Type extends string,
  Schema extends TrackInputSchema,
  Display extends string,
  Data,
> = {
  type: Type;
  defaults?: TrackModuleDefaults<Display>;
  schema: Schema;
  fetch: TrackModule<
    DefinedTrackConfig<Type, Schema, Display>,
    Data,
    DefinedTrackInput<Schema, Display>
  >["fetch"];
  render: Record<
    Display,
    ComponentType<TrackRendererProps<DefinedTrackConfig<Type, Schema, Display>, Data>>
  >;
  settings?: TrackModule<
    DefinedTrackConfig<Type, Schema, Display>,
    Data,
    DefinedTrackInput<Schema, Display>
  >["settings"];
};

export function defineTrackModule<
  Type extends string,
  Schema extends TrackInputSchema,
  Display extends string,
  Data,
>(
  definition: TrackModuleDefinition<Type, Schema, Display, Data>,
): TrackModule<
  DefinedTrackConfig<Type, Schema, Display>,
  Data,
  DefinedTrackInput<Schema, Display>
> {
  assertNoReservedFields(definition.type, definition.schema);

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
  });
  const inputSchema = definition.schema.safeExtend(baseSchema.shape).strict();
  const configSchema = inputSchema.safeExtend({
    type: z.literal(definition.type),
  });

  return {
    type: definition.type as DefinedTrackConfig<Type, Schema, Display>["type"],
    create(input) {
      const parsed = parsePublicInput(inputSchema, input, `${definition.type} config`);
      return {
        ...parsed,
        type: definition.type,
      } as DefinedTrackConfig<Type, Schema, Display>;
    },
    validate(config) {
      return parsePublicInput(
        configSchema,
        config,
        `${definition.type} config`,
      ) as DefinedTrackConfig<Type, Schema, Display>;
    },
    fetch: definition.fetch,
    render: definition.render,
    settings: definition.settings,
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
  ]);

  for (const field of Object.keys(schema.shape)) {
    if (reservedFields.has(field as ReservedTrackField)) {
      throw new Error(`Track schema for "${type}" cannot define reserved field "${field}"`);
    }
  }
}
