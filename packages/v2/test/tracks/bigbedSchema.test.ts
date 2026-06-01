import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseBigBedRowWithSchema } from "../../src/tracks/bigbed/schema";
import type { InferBigBedRow } from "../../src/tracks/bigbed/types";

describe("BigBed ordered Zod schema parsing", () => {
  it("parses full BED fields in schema key order", () => {
    const schema = z.object({
      chrom: z.string(),
      start: z.coerce.number(),
      end: z.coerce.number(),
      name: z.string(),
      score: z.coerce.number(),
      strand: z.string(),
    });

    const row = parseBigBedRowWithSchema(schema, "chr1", 10, 20, "peakA\t42\t+");

    expect(row).toMatchObject({
      chrom: "chr1",
      chr: "chr1",
      start: 10,
      end: 20,
      name: "peakA",
      score: 42,
      strand: "+",
    });
  });

  it("uses schema key order as the file column order", () => {
    const schema = z.object({
      chrom: z.string(),
      start: z.coerce.number(),
      end: z.coerce.number(),
      score: z.coerce.number(),
      name: z.string(),
    });

    const row = parseBigBedRowWithSchema(schema, "chr1", 10, 20, "42\tpeakA");

    expect(row.score).toBe(42);
    expect(row.name).toBe("peakA");
  });

  it("parses arbitrary extra fields after standard BED fields", () => {
    const schema = z.object({
      chrom: z.string(),
      start: z.coerce.number(),
      end: z.coerce.number(),
      name: z.string(),
      score: z.coerce.number(),
      strand: z.string(),
      signalValue: z.coerce.number(),
      pValue: z.coerce.number(),
      qValue: z.coerce.number(),
      peak: z.coerce.number(),
    });

    const row = parseBigBedRowWithSchema(schema, "chr2", 100, 200, "peakB\t5\t-\t8.5\t1e-4\t0.01\t50");

    expect(row).toMatchObject({
      signalValue: 8.5,
      pValue: 0.0001,
      qValue: 0.01,
      peak: 50,
    });
  });

  it("normalizes chromStart and chromEnd aliases for rendering", () => {
    const schema = z.object({
      chrom: z.string(),
      chromStart: z.coerce.number(),
      chromEnd: z.coerce.number(),
      name: z.string(),
    });

    const row = parseBigBedRowWithSchema(schema, "chr3", 30, 40, "peakC");

    expect(row.start).toBe(30);
    expect(row.end).toBe(40);
    expect(row.chromStart).toBe(30);
    expect(row.chromEnd).toBe(40);
  });

  it("throws a clear error when a row does not match the schema", () => {
    const schema = z.object({
      chrom: z.string(),
      start: z.coerce.number(),
      end: z.coerce.number(),
      score: z.coerce.number(),
    });

    expect(() => parseBigBedRowWithSchema(schema, "chr1", 10, 20, "not-a-number")).toThrow(
      /BigBed row does not match schema/,
    );
  });

  it("exposes a schema inference helper", () => {
    const schema = z.object({
      chrom: z.string(),
      start: z.coerce.number(),
      end: z.coerce.number(),
      name: z.string(),
    });

    const row: InferBigBedRow<typeof schema> = {
      chrom: "chr1",
      start: 10,
      end: 20,
      name: "peakA",
    };

    expect(row.name).toBe("peakA");
  });
});
