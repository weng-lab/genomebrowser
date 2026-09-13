import { describe, expect, it, vi } from "vitest";
import { bedSchemas, bedSchemaKeys } from "@weng-lab/genomebrowser-tracks/shared";
import { bigBedModule } from "../../src/bigbed";
import { bulkBedModule } from "../../src/bulkbed";
import { fetchBigBed } from "../../src/bigbed/fetch";
import { fetchBulkBed } from "../../src/bulkbed/fetch";
import { readCachedBigBedRows } from "../../src/shared/cachedFiles";

const reader = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@weng-lab/genomic-reader", async (original) => ({
  ...(await original<typeof import("@weng-lab/genomic-reader")>()),
  createBigBedFile: reader.create,
}));

const fields = {
  name: "Enhancer",
  score: "0",
  strand: ".",
  thickStart: "100",
  thickEnd: "200",
  color: "255,205,0",
  ccreClass: "dELS",
};

describe("BED schema selection", () => {
  it("exports schemas that consume the selected BED columns and parse colors", () => {
    expect(bedSchemaKeys).toEqual(["bed3", "bed4", "bed5", "bed6", "bed9", "ccre"]);
    expect(bedSchemas.bed3.parse(fields)).toEqual({});
    expect(bedSchemas.bed5.parse(fields)).toEqual({ name: "Enhancer", score: 0 });
    expect(bedSchemas.bed9.parse(fields)).toEqual({
      name: "Enhancer",
      score: 0,
      strand: ".",
      thickStart: 100,
      thickEnd: 200,
      color: "rgb(255,205,0)",
    });
    expect(bedSchemas.ccre.parse(fields)).toMatchObject({
      ccreClass: "dELS",
      color: "rgb(255,205,0)",
    });
    expect(bedSchemas.bed9.safeParse({ ...fields, color: "256,0,0" }).success).toBe(false);
  });

  it("validates serializable keys on both track types", () => {
    for (const module of [bigBedModule, bulkBedModule]) {
      const config =
        module.type === "bigbed"
          ? { url: "YOUR_URL_HERE" }
          : { datasets: [{ name: "Sample", url: "YOUR_URL_HERE" }] };
      for (const bedSchema of bedSchemaKeys) {
        const track = module.createInputSchema.parse({
          base: {
            id: "sample",
            title: "Sample",
          },
          config: { ...config, bedSchema },
        });
        expect(JSON.parse(JSON.stringify(track)).config.bedSchema).toBe(bedSchema);
      }
      expect(module.configSchema.safeParse({ ...config, bedSchema: "unknown" }).success).toBe(
        false,
      );
      expect(module.configSchema.safeParse(config).success).toBe(true);
    }
  });

  it.each([undefined, "bed3", "bed9", "ccre"] as const)(
    "uses schema %s in both fetchers, defaulting to BED9",
    async (bedSchema) => {
      reader.create.mockReset();
      reader.create.mockImplementation(({ schema }) => ({
        read: async () => [
          {
            chromosome: "chr1",
            start: 100,
            end: 200,
            fields: [],
            ...schema.parse(fields),
          },
        ],
      }));
      const values = new Map<string, unknown>();
      const resources = {
        get: <T>(key: string) => values.get(key) as T | undefined,
        set: (key: string, value: unknown) => {
          values.set(key, value);
        },
        delete: (key: string) => {
          values.delete(key);
        },
        clear: () => values.clear(),
      };
      const demand = {
        assembly: { id: "test", chromosomes: { chr1: 1000 } },
        region: { chromosome: "chr1", start: 100, end: 200 },
        width: 100,
      };
      const big = await fetchBigBed({
        resources,
        demand,
        track: {
          base: {
            id: "big",
            display: "dense",
          },
          type: "bigbed",
          config: { url: "YOUR_URL_HERE", bedSchema, rowHeight: 12 },
        },
      });
      expect(big[0]).toMatchObject(bedSchemas[bedSchema ?? "bed9"].parse(fields));
      const bulk = await fetchBulkBed({
        resources,
        demand,
        track: {
          base: {
            id: "bulk",
            display: "full",
          },
          type: "bulkbed",
          config: {
            datasets: [{ name: "Sample", url: "YOUR_URL_HERE" }],
            bedSchema,
            rowHeight: 12,
          },
        },
      });
      expect(bulk[0]?.[0]).toMatchObject({
        datasetName: "Sample",
        ...bedSchemas[bedSchema ?? "bed9"].parse(fields),
      });
      expect(reader.create.mock.calls.map(([options]) => options.schema)).toEqual([
        bedSchemas[bedSchema ?? "bed9"],
      ]);
    },
  );

  it("uses a new reader when the schema changes and reuses each URL/schema pair", async () => {
    reader.create.mockReset();
    reader.create.mockImplementation(({ schema }) => ({
      read: async () => [schema.parse(fields)],
    }));
    const values = new Map<string, unknown>();
    const resources = {
      delete: (key: string) => {
        values.delete(key);
      },
      clear: () => values.clear(),
      get: <T>(key: string) => values.get(key) as T | undefined,
      set: (key: string, value: unknown) => {
        values.set(key, value);
      },
    };
    const region = { chromosome: "chr1", start: 100, end: 200 };
    const url = "YOUR_URL_HERE";
    expect(await readCachedBigBedRows(resources, url, bedSchemas.bed3, region)).toEqual([{}]);
    expect(await readCachedBigBedRows(resources, url, bedSchemas.bed9, region)).toMatchObject([
      { color: "rgb(255,205,0)" },
    ]);
    await readCachedBigBedRows(resources, url, bedSchemas.bed3, region);
    expect(reader.create).toHaveBeenCalledTimes(2);
  });
});
