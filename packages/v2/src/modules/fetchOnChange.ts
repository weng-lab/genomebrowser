import { z } from "zod";
import type { AnyTrackModule, TrackConfigBase } from "./types";

const fetchOnChangeRegistry = z.registry<{ fetchOnChange: true }, z.ZodType>();
const moduleSchemaRegistry = new WeakMap<AnyTrackModule, z.ZodObject>();

export function fetchOnChange<T extends z.ZodType>(schema: T): T {
  fetchOnChangeRegistry.add(schema, { fetchOnChange: true });
  return schema;
}

export function registerFetchSchema(module: AnyTrackModule, schema: z.ZodObject) {
  moduleSchemaRegistry.set(module, schema);
}

export function createFetchSignature(module: AnyTrackModule, config: TrackConfigBase) {
  const schema = moduleSchemaRegistry.get(module);
  if (!schema) return "{}";

  return JSON.stringify(createSchemaSignature(schema, config) ?? {});
}

function createSchemaSignature(schema: z.ZodType, value: unknown): unknown {
  if (fetchOnChangeRegistry.has(schema)) return value;

  if (schema instanceof z.ZodObject) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

    const signature: Record<string, unknown> = {};
    const values = value as Record<string, unknown>;
    for (const [field, fieldSchema] of Object.entries(schema.shape)) {
      const fieldSignature = createSchemaSignature(fieldSchema, values[field]);
      if (fieldSignature !== undefined) signature[field] = fieldSignature;
    }

    return Object.keys(signature).length === 0 ? undefined : signature;
  }

  if (schema instanceof z.ZodArray) {
    if (!Array.isArray(value)) return undefined;

    const elementSchema = schema.element as z.ZodType;
    const signatures = value.map((item) => createSchemaSignature(elementSchema, item));
    return signatures.some((signature) => signature !== undefined) ? signatures : undefined;
  }

  return undefined;
}
