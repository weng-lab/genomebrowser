import { z } from "zod";
import type { GenomicRegion } from "./genomicFile";

/** Column numbers and counts include the three binary BED coordinate columns. */
export type BigBedParseContext = {
  region: GenomicRegion;
  column: number;
  field: string;
  value?: string;
  expectedColumns: number;
  actualColumns: number;
};

/** A Zod-compatible validation error with the failing BigBed record and column. */
export class BigBedParseError extends z.ZodError {
  readonly context: BigBedParseContext;

  constructor(cause: z.ZodError, context: BigBedParseContext) {
    super(cause.issues.map((issue) => ({ ...issue, path: [context.field, ...issue.path] })));
    this.context = context;
    const { region, column, field, value, expectedColumns, actualColumns } = context;
    const detail =
      value === undefined
        ? `Expected at least ${expectedColumns} columns; received ${actualColumns}. Missing column ${column} (${field}).`
        : `Column ${column} (${field}): received ${JSON.stringify(value)}. ${cause.issues.map((issue) => issue.message).join("; ")}`;
    this.message = `${detail} Record: ${region.chromosome}:${region.start}-${region.end}.`;
    this.cause = cause;
  }
}
