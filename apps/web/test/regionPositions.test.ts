import { hg38 } from "@weng-lab/genomebrowser";
import { expect, it } from "vitest";
import { regionFromPositions } from "../features/browser/regions/regions";

const read = (start: string, end: string) => regionFromPositions("chr11", { start, end }, hg38);

it("reads one-based positions as plain digits or with commas grouping thousands", () => {
  const region = { ok: true, region: { chromosome: "chr11", start: 5_225_000, end: 5_305_000 } };
  expect(read("5,225,001", "5,305,000")).toEqual(region);
  expect(read(" 5225001 ", "5305000")).toEqual(region);
  // A one-base region starts and ends at the same position.
  expect(read("10", "10")).toMatchObject({ ok: true, region: { start: 9, end: 10 } });
});

it("refuses misplaced commas instead of reading another position", () => {
  for (const typed of ["5,2,250,001", "52,25,001", ",5225001", "5225001,", "5,,225,001", "1,0"])
    expect(read(typed, "5,305,000")).toEqual({
      ok: false,
      field: "start",
      error: "Start must be a position like 5,225,001",
    });
  expect(read("1", "5,305,00")).toMatchObject({ ok: false, field: "end" });
});

it("names the field at fault for positions outside the chromosome or out of order", () => {
  expect(read("0", "10")).toMatchObject({
    field: "start",
    error: "Start must be a position from 1",
  });
  expect(read("10", "9")).toMatchObject({ field: "end", error: "End must be after start" });
  const length = hg38.chromosomes.chr11;
  expect(read("1", String(length))).toMatchObject({ ok: true });
  expect(read("1", String(length + 1))).toMatchObject({
    field: "end",
    error: expect.stringMatching(/^End must be within chr11, which ends at /),
  });
});
