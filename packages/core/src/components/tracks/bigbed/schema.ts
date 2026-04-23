import type { BigBedFieldKind, BigBedParser, BigBedSchema, InferBigBedRow, ReservedBigBedSchemaKey } from "./types";

const RESERVED_BIGBED_SCHEMA_KEYS = new Set<ReservedBigBedSchemaKey>(["chr", "start", "end", "rest"]);

export function defineBigBedSchema<const TSchema extends BigBedSchema>(schema: TSchema): TSchema {
  assertValidBigBedSchema(schema);
  return schema;
}

export function createBigBedSchemaParser<TSchema extends BigBedSchema>(
  schema: TSchema
): BigBedParser<InferBigBedRow<TSchema>> {
  assertValidBigBedSchema(schema);
  const entries = Object.entries(schema) as [keyof TSchema, BigBedFieldKind][];

  return (chrom, startBase, endBase, rest) => {
    const tokens = rest ? rest.split("\t") : [];
    const row: Record<string, unknown> = {
      chr: chrom,
      start: startBase,
      end: endBase,
      rest: tokens.slice(entries.length),
    };

    entries.forEach(([key, kind], index) => {
      const token = tokens[index];
      row[key as string] = token === undefined ? undefined : coerceBigBedValue(token, kind);
    });

    return row as InferBigBedRow<TSchema>;
  };
}

function coerceBigBedValue(value: string, kind: BigBedFieldKind): string | number {
  if (kind === "number") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }

  return value;
}

function assertValidBigBedSchema(schema: BigBedSchema) {
  for (const key of Object.keys(schema)) {
    if (RESERVED_BIGBED_SCHEMA_KEYS.has(key as ReservedBigBedSchemaKey)) {
      throw new Error(`BigBed schema key '${key}' is reserved`);
    }
  }
}
