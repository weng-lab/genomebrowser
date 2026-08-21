import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GenomicRegion, TrackFetchContext, TrackResources } from "@weng-lab/genomebrowser";

const reader = vi.hoisted(() => ({
  read: vi.fn(),
  createBigWigFile: vi.fn(),
}));

vi.mock("@weng-lab/genomic-reader", () => ({
  createBigWigFile: reader.createBigWigFile,
}));

import { fetchBigWig, fetchBigWigRaw } from "../../src/bigwig/fetch";

function createResources(): TrackResources & { map: Map<string, unknown> } {
  const map = new Map<string, unknown>();
  return {
    map,
    get: <T>(key: string) => map.get(key) as T | undefined,
    set: (key, value) => {
      map.set(key, value);
    },
    delete: (key) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
  };
}

type TestBigWigConfig = {
  url: string;
  fillWithZero: boolean;
  showClampIndicators: boolean;
  clampIndicatorColor: string;
};

function createContext(
  url: string,
  region: GenomicRegion,
  resources: TrackResources = createResources(),
): TrackFetchContext<TestBigWigConfig> {
  return {
    track: {
      id: "signal",
      type: "bigwig",
      display: "full",
      config: {
        url,
        fillWithZero: false,
        showClampIndicators: true,
        clampIndicatorColor: "#ff0000",
      },
    },
    demand: { assembly: { id: "test", chromosomes: { chr1: 1_000 } }, region, width: 100 },
    resources,
  };
}

describe("BigWig track fetching", () => {
  beforeEach(() => {
    reader.read.mockReset();
    reader.createBigWigFile.mockReset();
    reader.createBigWigFile.mockReturnValue({ read: reader.read });
  });

  it("reads unzoomed value records directly from the genomic reader", async () => {
    const region = { chromosome: "chr1", start: 10, end: 20 };
    reader.read.mockResolvedValue([
      { kind: "value", chromosome: "chr1", start: 12, end: 18, value: 2.5 },
    ]);

    await expect(fetchBigWigRaw({ url: "https://example.org/data.bw", region })).resolves.toEqual([
      { kind: "value", chromosome: "chr1", start: 12, end: 18, value: 2.5 },
    ]);

    expect(reader.createBigWigFile).toHaveBeenCalledWith({
      url: "https://example.org/data.bw",
    });
    expect(reader.read).toHaveBeenCalledWith(region, {
      resolution: { mode: "unzoomed" },
    });
  });

  it("reuses the cached file across fetches of one track", async () => {
    const region = { chromosome: "chr1", start: 10, end: 20 };
    const firstFile = { read: vi.fn().mockResolvedValue([]) };
    const secondFile = { read: vi.fn().mockResolvedValue([]) };
    reader.createBigWigFile.mockReturnValueOnce(firstFile).mockReturnValueOnce(secondFile);
    const context = createContext("https://example.org/data.bw", region);

    await fetchBigWig(context);
    await fetchBigWig(context);

    expect(reader.createBigWigFile).toHaveBeenCalledOnce();
    expect(firstFile.read).toHaveBeenCalledTimes(2);
    expect(secondFile.read).not.toHaveBeenCalled();
    expect(context.resources.get<{ url: string }>("file")?.url).toBe("https://example.org/data.bw");
  });

  it("replaces the cached file when the source URL changes", async () => {
    const region = { chromosome: "chr1", start: 10, end: 20 };
    const firstFile = { read: vi.fn().mockResolvedValue([]) };
    const secondFile = { read: vi.fn().mockResolvedValue([]) };
    reader.createBigWigFile.mockReturnValueOnce(firstFile).mockReturnValueOnce(secondFile);

    const sharedResources = createResources();
    await fetchBigWig(createContext("https://example.org/first.bw", region, sharedResources));
    await fetchBigWig(createContext("https://example.org/second.bw", region, sharedResources));

    expect(reader.createBigWigFile).toHaveBeenCalledTimes(2);
    expect(reader.createBigWigFile).toHaveBeenLastCalledWith({
      url: "https://example.org/second.bw",
    });
    expect(secondFile.read).toHaveBeenCalledOnce();
  });
});
