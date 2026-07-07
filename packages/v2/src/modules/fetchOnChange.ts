import { z } from "zod";
import type { TrackInstance } from "./types";

const fetchOnChangeRegistry = z.registry<{ fetchOnChange: true }, z.core.$ZodType>();

export function fetchOnChange<Schema extends z.core.$ZodType>(schema: Schema): Schema {
  fetchOnChangeRegistry.add(schema, { fetchOnChange: true });
  return schema;
}

export function createFetchSignature<Config>(
  module: { configSchema: z.ZodType<Config> },
  track: TrackInstance<Config, never>,
) {
  return JSON.stringify(createSchemaSignature(module.configSchema, track.config) ?? {});
}

function createSchemaSignature(schema: z.core.$ZodType, value: unknown): unknown {
  if (fetchOnChangeRegistry.has(schema)) return value;

  if (schema instanceof z.ZodObject) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

    const signature: Record<string, unknown> = {};
    for (const [field, fieldSchema] of Object.entries(schema.shape)) {
      const fieldSignature = createSchemaSignature(fieldSchema, Reflect.get(value, field));
      if (fieldSignature !== undefined) signature[field] = fieldSignature;
    }

    return Object.keys(signature).length === 0 ? undefined : signature;
  }

  if (schema instanceof z.ZodArray) {
    if (!Array.isArray(value)) return undefined;

    const signatures = value.map((item) => createSchemaSignature(schema.element, item));
    return signatures.some((signature) => signature !== undefined) ? signatures : undefined;
  }

  return undefined;
}
