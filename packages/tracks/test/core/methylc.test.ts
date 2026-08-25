import { beforeEach, describe, expect, it, vi } from "vitest";

const reader = vi.hoisted(() => ({
  getZoomLevels: vi.fn(),
  read: vi.fn(),
  readZoomLevel: vi.fn(),
  createBigWigFile: vi.fn(),
}));

vi.mock("@weng-lab/genomic-reader", () => ({
  createBigWigFile: reader.createBigWigFile,
}));

import { fetchMethylC } from "../../src/methylc/fetch";
import type { MethylCConfig } from "../../src/methylc/types";

describe("MethylC track fetching", () => {
  beforeEach(() => {
    reader.getZoomLevels.mockReset();
    reader.read.mockReset();
    reader.readZoomLevel.mockReset();
    reader.createBigWigFile.mockReset();
    reader.createBigWigFile.mockReturnValue({
      getZoomLevels: reader.getZoomLevels,
      read: reader.read,
      readZoomLevel: reader.readZoomLevel,
    });
    reader.getZoomLevels.mockResolvedValue([]);
    reader.read.mockResolvedValue([
      { kind: "value", chromosome: "chr1", start: 12, end: 18, value: 0.75 },
    ]);
  });

  it("reads every configured BigWig channel through the new genomic reader", async () => {
    const region = { chromosome: "chr1", start: 10, end: 20 };
    const config = createConfig((channel) => `https://example.org/${channel}.bw`);

    const result = await fetchMethylC(createContext(config, region));

    expect(reader.createBigWigFile).toHaveBeenCalledTimes(8);
    expect(reader.createBigWigFile).toHaveBeenNthCalledWith(1, {
      url: "https://example.org/plus-cpg.bw",
    });
    expect(reader.createBigWigFile).toHaveBeenNthCalledWith(8, {
      url: "https://example.org/minus-depth.bw",
    });
    expect(reader.read).toHaveBeenCalledTimes(8);
    expect(reader.read).toHaveBeenCalledWith(region);
    expect(result).toHaveLength(8);
    expect(result[0]).toEqual([
      { kind: "value", chromosome: "chr1", start: 12, end: 18, value: 0.75 },
    ]);
  });

  it("does not create a reader for empty channel URLs", async () => {
    const config = createConfig(() => "");

    await expect(
      fetchMethylC(createContext(config, { chromosome: "chr1", start: 10, end: 20 })),
    ).resolves.toEqual([[], [], [], [], [], [], [], []]);
    expect(reader.createBigWigFile).not.toHaveBeenCalled();
  });

  it("uses zoom summaries for every configured channel at wide regions", async () => {
    const region = { chromosome: "chr1", start: 0, end: 100_000 };
    const config = createConfig((channel) => `https://example.org/${channel}.bw`);
    reader.getZoomLevels.mockResolvedValue([100, 400, 1_600]);
    reader.readZoomLevel.mockResolvedValue([]);

    await fetchMethylC(createContext(config, region));

    expect(reader.readZoomLevel).toHaveBeenCalledTimes(8);
    expect(reader.readZoomLevel).toHaveBeenCalledWith(region, 400);
    expect(reader.read).not.toHaveBeenCalled();
  });

  it("reuses cached channel readers across fetches of one track", async () => {
    const config = createConfig((channel) => `https://example.org/${channel}.bw`);
    const context = createContext(config, { chromosome: "chr1", start: 10, end: 20 });

    await fetchMethylC(context);
    await fetchMethylC(context);
    await fetchMethylC(context);

    expect(reader.createBigWigFile).toHaveBeenCalledTimes(8);
    expect(reader.read).toHaveBeenCalledTimes(24);
  });
});

function createConfig(urlFor: (channel: string) => string): MethylCConfig {
  return {
    maskCpgByCoverage: false,
    colors: {
      cpg: "#648bd8",
      chg: "#ff944d",
      chh: "#ff00ff",
      depth: "#525252",
    },
    urls: {
      plusStrand: {
        cpg: { url: urlFor("plus-cpg") },
        chg: { url: urlFor("plus-chg") },
        chh: { url: urlFor("plus-chh") },
        depth: { url: urlFor("plus-depth") },
      },
      minusStrand: {
        cpg: { url: urlFor("minus-cpg") },
        chg: { url: urlFor("minus-chg") },
        chh: { url: urlFor("minus-chh") },
        depth: { url: urlFor("minus-depth") },
      },
    },
  };
}

function createContext(
  config: MethylCConfig,
  region: { chromosome: string; start: number; end: number },
) {
  const values = new Map<string, unknown>();
  return {
    track: { id: "methylc", type: "methylc", display: "full", config },
    demand: {
      assembly: { id: "test", chromosomes: { chr1: 1_000 } },
      region,
      width: 100,
    },
    resources: {
      get: <T>(key: string) => values.get(key) as T | undefined,
      set: (key: string, value: unknown) => {
        values.set(key, value);
      },
      delete: (key: string) => {
        values.delete(key);
      },
      clear: () => {
        values.clear();
      },
    },
  };
}
