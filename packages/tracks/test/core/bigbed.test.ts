import { beforeEach, describe, expect, it, vi } from "vitest";

const reader = vi.hoisted(() => ({
  read: vi.fn(),
  createBigBedFile: vi.fn(),
}));

vi.mock("@weng-lab/genomic-reader", () => ({
  bed3Schema: { schema: "bed3" },
  createBigBedFile: reader.createBigBedFile,
}));

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
      schema: bed3Schema,
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
