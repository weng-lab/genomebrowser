import { describe, expect, it } from "vitest";
import { z } from "zod";
import { BigBedParseError, bed3Schema } from "../src/lib";
import { decodeBigBedBlock, stableSortBigBedRecords } from "../src/internal/bigBedDecoder";

const encoder = new TextEncoder();

function record(chromosomeId: number, start: number, end: number, payload: string): Uint8Array {
  const text = encoder.encode(payload);
  const bytes = new Uint8Array(13 + text.byteLength);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, chromosomeId, true);
  view.setUint32(4, start, true);
  view.setUint32(8, end, true);
  bytes.set(text, 12);
  return bytes;
}

function concatenate(...chunks: Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(chunks.reduce((length, chunk) => length + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

describe("BigBed record decoding", () => {
  it("preserves payload fields, skips neighboring chromosomes, and stably orders duplicates", async () => {
    const block = concatenate(
      record(2, 8, 12, "neighbor"),
      record(1, 20, 30, "late"),
      record(1, 10, 20, ""),
      record(1, 10, 20, "first\t\tthird\t"),
      record(1, 10, 20, "duplicate"),
    );
    const decoded = await decodeBigBedBlock(
      block,
      "little-endian",
      1,
      "chr1",
      0,
      100,
      bed3Schema,
      [],
    );

    expect(stableSortBigBedRecords(decoded)).toEqual([
      { chromosome: "chr1", start: 10, end: 20, fields: [] },
      { chromosome: "chr1", start: 10, end: 20, fields: ["first", "", "third", ""] },
      { chromosome: "chr1", start: 10, end: 20, fields: ["duplicate"] },
      { chromosome: "chr1", start: 20, end: 30, fields: ["late"] },
    ]);
  });

  it("rejects truncated records and missing payload terminators without partial success", async () => {
    await expect(
      decodeBigBedBlock(Uint8Array.of(1, 0, 0), "little-endian", 1, "chr1", 0, 100, bed3Schema, []),
    ).rejects.toThrow(RangeError);

    const unterminated = record(1, 10, 20, "payload").subarray(0, -1);
    await expect(
      decodeBigBedBlock(unterminated, "little-endian", 1, "chr1", 0, 100, bed3Schema, []),
    ).rejects.toThrow("missing its NUL terminator");
  });

  it("uses unsigned coordinates and detected big-endian byte order", async () => {
    const bytes = record(1, 0, 0, "field");
    const view = new DataView(bytes.buffer);
    view.setUint32(0, 0xfedcba98, false);
    view.setUint32(4, 0xfffffffe, false);
    view.setUint32(8, 0xffffffff, false);

    await expect(
      decodeBigBedBlock(
        bytes,
        "big-endian",
        0xfedcba98,
        "chrUnsigned",
        0xfffffffd,
        0xffffffff,
        bed3Schema,
        [],
      ),
    ).resolves.toEqual([
      {
        chromosome: "chrUnsigned",
        start: 0xfffffffe,
        end: 0xffffffff,
        fields: ["field"],
      },
    ]);
  });
});

describe("BigBed schema diagnostics", () => {
  const schema = z.object({
    name: z.string(),
    score: z.coerce.number(),
    strand: z.string(),
    signalValue: z.coerce.number(),
    pValue: z.coerce.number(),
    qValue: z.coerce.number(),
    peak: z.coerce.number(),
  });
  const decode = (payload: string, selected = schema) =>
    decodeBigBedBlock(
      record(1, 10, 20, payload),
      "little-endian",
      1,
      "chr1",
      0,
      100,
      selected,
      Object.keys(selected.shape),
    );

  it("preserves custom field names, raw values, record coordinates, and Zod compatibility", async () => {
    const error = await decode("peak1\t611\t.\t10.8645\t65.6076\tinvalid\t418").catch(
      (error) => error,
    );
    expect(error).toBeInstanceOf(z.ZodError);
    expect(error).toBeInstanceOf(BigBedParseError);
    expect(error.context).toEqual({
      region: { chromosome: "chr1", start: 10, end: 20 },
      column: 9,
      field: "qValue",
      value: "invalid",
      expectedColumns: 10,
      actualColumns: 10,
    });
    expect(error.issues[0].path).toEqual(["qValue"]);
    expect(error.message).toContain('Column 9 (qValue): received "invalid"');
    expect(error.message).toContain("chr1:10-20");
    expect(error.cause).toBeInstanceOf(z.ZodError);
  });

  it("reports the first missing column and total BED column counts", async () => {
    const error = await decode("peak1\t611\t.").catch((error) => error);
    expect(error.context).toMatchObject({
      column: 7,
      field: "signalValue",
      expectedColumns: 10,
      actualColumns: 6,
    });
    expect(error.message).toContain("Expected at least 10 columns; received 6");
    expect(error.issues[0].path).toEqual(["signalValue"]);
  });

  it("preserves extra narrowPeak values under a BED6 schema", async () => {
    const bed6 = schema.pick({ name: true, score: true, strand: true });
    const rows = await decodeBigBedBlock(
      record(1, 10, 20, "peak1\t611\t.\t10.8645\t65.6076\t61.1871\t418"),
      "little-endian",
      1,
      "chr1",
      0,
      100,
      bed6,
      Object.keys(bed6.shape),
    );
    expect(rows).toEqual([
      {
        chromosome: "chr1",
        start: 10,
        end: 20,
        name: "peak1",
        score: 611,
        strand: ".",
        fields: ["10.8645", "65.6076", "61.1871", "418"],
      },
    ]);
  });
});
