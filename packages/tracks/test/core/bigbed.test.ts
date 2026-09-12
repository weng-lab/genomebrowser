import { beforeEach, describe, expect, it, vi } from "vitest";

const reader = vi.hoisted(() => ({
  read: vi.fn(),
  createBigBedFile: vi.fn(),
}));

vi.mock("@weng-lab/genomic-reader", async (original) => ({
  ...(await original<typeof import("@weng-lab/genomic-reader")>()),
  createBigBedFile: reader.createBigBedFile,
}));

import { bedSchemas } from "../../src/shared/bedSchemas";
import { bed3Schema } from "@weng-lab/genomic-reader";
import type { GenomicRegion, TrackFetchContext, TrackResources } from "@weng-lab/genomebrowser";
import { fetchBigBed, fetchBigBedRows } from "../../src/bigbed/fetch";
import { bigBedModule } from "../../src/bigbed";

function createResources(): TrackResources {
  const values = new Map<string, unknown>();
  return {
    get: <T>(key: string) => values.get(key) as T | undefined,
    set: (key, value) => {
      values.set(key, value);
    },
    delete: (key) => {
      values.delete(key);
    },
    clear: () => {
      values.clear();
    },
  };
}

function createContext(
  url: string,
  region: GenomicRegion,
  resources: TrackResources = createResources(),
): TrackFetchContext<{ url: string; rowHeight: number }> {
  return {
    track: { id: "peaks", type: "bigbed", display: "full", config: { url, rowHeight: 12 } },
    demand: { assembly: { id: "test", chromosomes: { chr1: 1_000 } }, region, width: 100 },
    resources,
  };
}

describe("BigBed track", () => {
  beforeEach(() => {
    reader.read.mockReset();
    reader.createBigBedFile.mockReset();
    reader.createBigBedFile.mockReturnValue({ read: reader.read });
  });

  it("defines tooltip UI on the module", () => {
    const config = bigBedModule.create({
      id: "peaks",
      title: "Peaks",
      config: { url: "YOUR_URL_HERE" },
    });

    expect(bigBedModule.tooltipComponent).toBeTypeOf("function");
    expect(config).not.toHaveProperty("tooltip");
    expect(config.base.height).toBe(12);
    expect(config.config.rowHeight).toBe(12);
  });

  it("rejects invalid row heights", () => {
    expect(() =>
      bigBedModule.create({
        id: "peaks",
        title: "Peaks",
        config: { url: "YOUR_URL_HERE", rowHeight: 0 },
      }),
    ).toThrow(/bigbed input/);
  });

  it("reads BigBed records with the genomic reader BED3 schema", async () => {
    const region = { chromosome: "chr1", start: 10, end: 20 };
    const records = [{ chromosome: "chr1", start: 12, end: 18, fields: ["feature"] }];
    reader.read.mockResolvedValue(records);

    await expect(
      fetchBigBedRows({ url: "https://example.org/data.bb", region, schema: bed3Schema }),
    ).resolves.toBe(records);

    expect(reader.createBigBedFile).toHaveBeenCalledWith({
      url: "https://example.org/data.bb",
      schema: bed3Schema,
    });
    expect(reader.read).toHaveBeenCalledWith(region);
  });

  it("reuses the cached file across fetches and replaces it when the URL changes", async () => {
    const region = { chromosome: "chr1", start: 10, end: 20 };
    const firstFile = { read: vi.fn().mockResolvedValue([]) };
    const secondFile = { read: vi.fn().mockResolvedValue([]) };
    reader.createBigBedFile.mockReturnValueOnce(firstFile).mockReturnValueOnce(secondFile);
    const sharedResources = createResources();

    await fetchBigBed(createContext("https://example.org/first.bb", region, sharedResources));
    await fetchBigBed(createContext("https://example.org/first.bb", region, sharedResources));
    await fetchBigBed(createContext("https://example.org/second.bb", region, sharedResources));

    expect(reader.createBigBedFile).toHaveBeenCalledTimes(2);
    expect(reader.createBigBedFile).toHaveBeenNthCalledWith(1, {
      url: "https://example.org/first.bb",
      schema: bedSchemas.bed9,
    });
    expect(firstFile.read).toHaveBeenCalledTimes(2);
    expect(secondFile.read).toHaveBeenCalledOnce();
  });

  it("isolates cached files between tracks", async () => {
    const region = { chromosome: "chr1", start: 10, end: 20 };
    reader.createBigBedFile.mockReturnValue({ read: reader.read });

    // Separate resource stores simulate two different tracks in one browser.
    await fetchBigBed(createContext("https://example.org/data.bb", region));
    await fetchBigBed(createContext("https://example.org/data.bb", region));

    expect(reader.createBigBedFile).toHaveBeenCalledTimes(2);
  });
});

describe("BigBed parse guidance", () => {
  it.each([undefined, "bed9"] as const)("explains the selected preset %s", async (preset) => {
    const { BigBedParseError } = await import("@weng-lab/genomic-reader");
    const result = bedSchemas.bed9.shape.color.safeParse("61.1871");
    if (result.success) throw new Error("Expected an invalid color");
    const error = new BigBedParseError(result.error, {
      region: { chromosome: "chr12", start: 53379407, end: 53380249 },
      column: 9,
      field: "color",
      value: "61.1871",
      expectedColumns: 9,
      actualColumns: 10,
    });
    reader.createBigBedFile.mockReturnValue({ read: vi.fn().mockRejectedValue(error) });
    const context = createContext("https://example.org/data.bb", error.context.region);
    const failure = await fetchBigBed({
      ...context,
      track: { ...context.track, config: { ...context.track.config, bedSchema: preset } },
    }).catch((error) => error);
    expect(failure.message).toContain('Column 9 (color): received "61.1871"');
    expect(failure.message).toContain("Expected itemRgb as 0 or R,G,B");
    expect(failure.message).toContain(
      `Selected schema: bed9${preset === undefined ? " (default)" : ""}.`,
    );
    expect(failure.message).toContain("config.bedSchema");
    expect(failure.cause).toBe(error);
  });

  it("does not mislabel network failures as schema failures", async () => {
    const error = new Error("Network unavailable");
    reader.createBigBedFile.mockReturnValue({ read: vi.fn().mockRejectedValue(error) });
    await expect(
      fetchBigBed(
        createContext("https://example.org/data.bb", { chromosome: "chr1", start: 0, end: 100 }),
      ),
    ).rejects.toBe(error);
  });
});
