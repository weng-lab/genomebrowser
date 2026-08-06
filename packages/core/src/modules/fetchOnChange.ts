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
  let signatureValue: unknown;
  try {
    signatureValue = createSchemaSignature(module.configSchema, track.config) ?? {};
  } catch {
    // A hostile custom value must not make a committed store mutation throw from
    // a subscriber. Falling back to the complete config may over-fetch, but it
    // cannot mistake a changed config object for an unchanged fetch signature.
    signatureValue = track.config;
  }
  return JSON.stringify(encodeSignatureValue(signatureValue, { references: new Map() }));
}

type EncodingContext = {
  references: Map<object, number>;
};

type EncodedSignatureValue = unknown[];

const sessionObjectIds = new WeakMap<object, number>();
const sessionSymbolIds = new Map<symbol, number>();
let nextSessionIdentity = 1;

function encodeSignatureValue(value: unknown, context: EncodingContext): EncodedSignatureValue {
  if (value === null) return ["null"];

  switch (typeof value) {
    case "undefined":
      return ["undefined"];
    case "boolean":
      return ["boolean", value];
    case "number":
      return encodeNumber(value);
    case "string":
      return ["string", value];
    case "bigint":
      return ["bigint", value.toString()];
    case "symbol":
      return ["symbol", getSymbolIdentity(value), Symbol.keyFor(value), value.description];
    case "function":
      return ["function", getObjectIdentity(value)];
    case "object":
      return encodeObject(value, context);
  }

  return ["unknown", String(value)];
}

function encodeNumber(value: number): EncodedSignatureValue {
  if (Number.isNaN(value)) return ["number", "nan"];
  if (value === Number.POSITIVE_INFINITY) return ["number", "positive-infinity"];
  if (value === Number.NEGATIVE_INFINITY) return ["number", "negative-infinity"];
  if (Object.is(value, -0)) return ["number", "negative-zero"];
  return ["number", value];
}

function encodeObject(value: object, context: EncodingContext): EncodedSignatureValue {
  const existingReference = context.references.get(value);
  if (existingReference !== undefined) return ["reference", existingReference];

  const reference = context.references.size;
  context.references.set(value, reference);

  try {
    if (value instanceof Date) {
      const timestamp = Date.prototype.getTime.call(value);
      return ["date", reference, encodeNumber(timestamp), encodeProperties(value, context)];
    }
    if (value instanceof Map) {
      const entries = Array.from(Map.prototype.entries.call(value) as Iterable<[unknown, unknown]>);
      return [
        "map",
        reference,
        entries.map(([key, item]) => [
          encodeSignatureValue(key, context),
          encodeSignatureValue(item, context),
        ]),
        encodeProperties(value, context),
      ];
    }
    if (value instanceof Set) {
      const items = Array.from(Set.prototype.values.call(value) as Iterable<unknown>);
      return [
        "set",
        reference,
        items.map((item) => encodeSignatureValue(item, context)),
        encodeProperties(value, context),
      ];
    }
    if (value instanceof RegExp) {
      return [
        "regexp",
        reference,
        value.source,
        value.flags,
        value.lastIndex,
        encodeProperties(value, context),
      ];
    }
    if (value instanceof ArrayBuffer) {
      return [
        "array-buffer",
        reference,
        getObjectIdentity(value),
        Array.from(new Uint8Array(value)),
      ];
    }
    if (ArrayBuffer.isView(value)) {
      return [
        "array-buffer-view",
        reference,
        getObjectIdentity(value),
        value.constructor.name,
        Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)),
      ];
    }

    const prototype = Object.getPrototypeOf(value);
    if (Array.isArray(value)) return ["array", reference, encodeProperties(value, context)];
    if (prototype === Object.prototype) {
      return ["object", reference, encodeProperties(value, context)];
    }
    if (prototype === null) {
      return ["null-prototype-object", reference, encodeProperties(value, context)];
    }
    return [
      "custom-instance",
      reference,
      getObjectIdentity(prototype),
      getObjectIdentity(value),
      encodeProperties(value, context),
    ];
  } catch {
    return ["opaque-object", reference, getObjectIdentity(value)];
  }
}

function encodeProperties(value: object, context: EncodingContext): EncodedSignatureValue[] {
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(descriptors)
    .map((key) => ({ key, encodedKey: encodePropertyKey(key) }))
    .sort((left, right) => compareCodeUnits(left.encodedKey, right.encodedKey))
    .map(({ key, encodedKey }) => {
      const descriptor = descriptors[key as keyof typeof descriptors];
      if (!descriptor) return ["missing-property", encodedKey];
      if ("value" in descriptor) {
        return [
          "data-property",
          encodedKey,
          descriptor.enumerable,
          descriptor.configurable,
          descriptor.writable,
          encodeSignatureValue(descriptor.value, context),
        ];
      }
      return [
        "accessor-property",
        encodedKey,
        descriptor.enumerable,
        descriptor.configurable,
        descriptor.get ? getObjectIdentity(descriptor.get) : null,
        descriptor.set ? getObjectIdentity(descriptor.set) : null,
      ];
    });
}

function encodePropertyKey(key: PropertyKey) {
  return typeof key === "symbol" ? `symbol:${getSymbolIdentity(key)}` : `string:${String(key)}`;
}

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function getObjectIdentity(value: object) {
  const existing = sessionObjectIds.get(value);
  if (existing !== undefined) return existing;
  const identity = nextSessionIdentity++;
  sessionObjectIds.set(value, identity);
  return identity;
}

function getSymbolIdentity(value: symbol) {
  const existing = sessionSymbolIds.get(value);
  if (existing !== undefined) return existing;
  const identity = nextSessionIdentity++;
  sessionSymbolIds.set(value, identity);
  return identity;
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
