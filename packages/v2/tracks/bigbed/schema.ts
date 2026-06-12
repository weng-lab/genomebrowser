import { z } from "zod";
import type { BigBedRow, BigBedSchema } from "./types";

export type BigBedParser<Row = BigBedRow> = (
  chrom: string,
  start: number,
  end: number,
  rest: string,
) => Row;

export function createBigBedSchemaParser<TSchema extends BigBedSchema>(
  schema: TSchema,
): BigBedParser<z.output<TSchema> & BigBedRow> {
  const fields = Object.keys(schema.shape);

  return (chrom, start, end, rest) => {
    try {
      const tokens = rest ? rest.split("\t") : [];
      const columns: unknown[] = [chrom, start, end, ...tokens];
      const row: Record<string, unknown> = {};

      fields.forEach((field, index) => {
        row[field] = columns[index];
      });

      const parsed = schema.parse(row) as Record<string, unknown>;
      const normalized = normalizeParsedBigBedRow(parsed, chrom, start, end);

      return normalized as z.output<TSchema> & BigBedRow;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`BigBed row does not match schema: ${z.prettifyError(error)}`);
      }
      throw error;
    }
  };
}

export function parseBigBedRowWithSchema<TSchema extends BigBedSchema>(
  schema: TSchema,
  chrom: string,
  start: number,
  end: number,
  rest: string,
): z.output<TSchema> & BigBedRow {
  return createBigBedSchemaParser(schema)(chrom, start, end, rest);
}

function normalizeParsedBigBedRow(
  parsed: Record<string, unknown>,
  fallbackChrom: string,
  fallbackStart: number,
  fallbackEnd: number,
): Record<string, unknown> & BigBedRow {
  const start = getNumber(parsed.start) ?? getNumber(parsed.chromStart) ?? fallbackStart;
  const end = getNumber(parsed.end) ?? getNumber(parsed.chromEnd) ?? fallbackEnd;
  const chrom = getString(parsed.chrom) ?? getString(parsed.chr) ?? fallbackChrom;

  return {
    ...parsed,
    chrom,
    chr: getString(parsed.chr) ?? chrom,
    start,
    end,
  } as Record<string, unknown> & BigBedRow;
}

function getNumber(value: unknown) {
  return typeof value === "number" && !Number.isNaN(value) ? value : undefined;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
