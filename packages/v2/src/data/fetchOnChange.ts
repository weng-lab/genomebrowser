import { z } from "zod";
import type { AnyTrackModule, TrackConfigBase } from "../modules/types";

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

  const values: Record<string, unknown> = {};
  const configValues = config as Record<string, unknown>;

  for (const [field, fieldSchema] of Object.entries(schema.shape)) {
    if (fetchOnChangeRegistry.has(fieldSchema)) {
      values[field] = configValues[field];
    }
  }

  return JSON.stringify(values);
}
