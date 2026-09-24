import { z } from "zod";
const fetchOnChangeRegistry = z.registry<{ fetchOnChange: true }, z.core.$ZodType>();

export function fetchOnChange<Schema extends z.core.$ZodType>(schema: Schema): Schema {
  fetchOnChangeRegistry.add(schema, { fetchOnChange: true });
  return schema;
}

export function createFetchSignature<Config, Track extends { config: Config }>(
  module: { configSchema: z.ZodType<Config> },
  track: Track,
) {
  try {
    const signatureValue = createSchemaSignature(module.configSchema, track.config) ?? {};
    return JSON.stringify(signatureValue, replaceNonJsonValue);
  } catch {
    // A hostile or cyclic value must not make a committed store mutation throw
    // from a subscriber. Comparing the config by identity may over-fetch, but it
    // cannot mistake a changed config object for an unchanged fetch signature.
    return JSON.stringify({ $identity: getIdentity(track.config) });
  }
}

const identities = new WeakMap<object, number>();
const symbolIdentities = new Map<symbol, number>();
let nextIdentity = 1;

function getIdentity(value: unknown) {
  if (typeof value === "symbol") {
    let identity = symbolIdentities.get(value);
    if (identity === undefined) symbolIdentities.set(value, (identity = nextIdentity++));
    return identity;
  }
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return null;
  let identity = identities.get(value);
  if (identity === undefined) identities.set(value, (identity = nextIdentity++));
  return identity;
}

// Marked values compare by content when they are JSON and by identity otherwise.
// Read `this[key]` because JSON.stringify applies `toJSON` (for example on Date)
// before calling the replacer.
function replaceNonJsonValue(this: unknown, key: string, value: unknown) {
  const original: unknown = key === "" ? value : Reflect.get(this as object, key);
  switch (typeof original) {
    case "string":
    case "boolean":
    case "undefined":
      return original;
    case "number":
      return Number.isFinite(original) ? original : { $number: String(original) };
    case "bigint":
      return { $bigint: original.toString() };
    case "object": {
      if (original === null || Array.isArray(original)) return original;
      const prototype = Object.getPrototypeOf(original);
      if (prototype === Object.prototype || prototype === null) return original;
      return { $identity: getIdentity(original) };
    }
    default:
      return { $identity: getIdentity(original) };
  }
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
