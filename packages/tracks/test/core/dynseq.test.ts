import type { GenomicRegion, TrackFetchContext, TrackResources } from "@weng-lab/genomebrowser";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reader = vi.hoisted(() => ({
  readBigWig: vi.fn(),
  readTwoBit: vi.fn(),
  createBigWigFile: vi.fn(),
  createTwoBitFile: vi.fn(),
}));

vi.mock("@weng-lab/genomic-reader", () => ({
  createBigWigFile: reader.createBigWigFile,
  createTwoBitFile: reader.createTwoBitFile,
}));

import { dynseqModule } from "../../src/dynseq";
import { fetchDynseq } from "../../src/dynseq/fetch";
import type { DynseqConfig } from "../../src/dynseq/types";

function createResources(): TrackResources {
  const map = new Map<string, unknown>();
  return {
    get: <T>(key: string) => map.get(key) as T | undefined,
    set: (key, value) => void map.set(key, value),
    delete: (key) => void map.delete(key),
    clear: () => map.clear(),
  };
}

const region: GenomicRegion = { chromosome: "chr1", start: 100, end: 110 };

function createContext(resources = createResources()) {
  return {
    track: {
      base: { id: "dynseq", display: "full" },
      type: "dynseq",
      config: dynseqModule.configSchema.parse({
        url: "https://example.test/scores.bw",
        twoBitUrl: "https://example.test/genome.2bit",
      }),
    },
    demand: {
      assembly: { id: "test", chromosomes: { chr1: 1000 } },
      region,
      width: 500,
    },
    resources,
  } as unknown as TrackFetchContext<DynseqConfig>;
}

beforeEach(() => {
  reader.readBigWig.mockReset();
  reader.readTwoBit.mockReset();
  reader.createBigWigFile.mockReset().mockReturnValue({
    read: reader.readBigWig,
    readZoomLevel: vi.fn(),
    getZoomLevels: vi.fn(),
  });
  reader.createTwoBitFile.mockReset().mockReturnValue({ read: reader.readTwoBit });
});

describe("dynseq module", () => {
  it("creates with documented defaults", () => {
    const track = dynseqModule.create({
      base: { id: "phylop", title: "phyloP" },
      config: {
        url: "https://example.test/scores.bw",
        twoBitUrl: "https://example.test/genome.2bit",
      },
    });
    expect(track.base).toMatchObject({ display: "full", height: 80, color: "#2266aa" });
    expect(track.config).toMatchObject({ minPixelsPerBase: 3, maxLetterBases: 500 });
  });

  it("requires both a score file and a reference", () => {
    expect(() =>
      dynseqModule.create({
        base: { id: "a", title: "A" },
        config: { url: "https://example.test/scores.bw" } as never,
      }),
    ).toThrow();
  });
});

describe("dynseq fetching", () => {
  it("preserves scored intervals instead of allocating a point for every base", async () => {
    const scores = [{ kind: "value", chromosome: "chr1", start: 100, end: 110, value: 0.5 }];
    const sequences = [{ chromosome: "chr1", start: 100, end: 110, sequence: "ACGTacgtAC" }];
    reader.readBigWig.mockResolvedValue(scores);
    reader.readTwoBit.mockResolvedValue(sequences);
    const data = await fetchDynseq(createContext());
    expect(data.signal).toBe(scores);
    expect(data.sequence).toBe(sequences);
  });

  it("reads source values rather than a zoom summary", async () => {
    reader.readBigWig.mockResolvedValue([]);
    reader.readTwoBit.mockResolvedValue([
      { chromosome: "chr1", start: 100, end: 110, sequence: "ACGTACGTAC" },
    ]);
    const file = { read: reader.readBigWig, readZoomLevel: vi.fn(), getZoomLevels: vi.fn() };
    reader.createBigWigFile.mockReturnValue(file);

    await fetchDynseq(createContext());
    expect(file.read).toHaveBeenCalledWith(region);
    expect(file.readZoomLevel).not.toHaveBeenCalled();
    expect(file.getZoomLevels).not.toHaveBeenCalled();
  });

  it("retains signal when the reference has no sequence for the region", async () => {
    const scores = [{ kind: "value", chromosome: "chr1", start: 100, end: 101, value: 1 }];
    reader.readBigWig.mockResolvedValue(scores);
    reader.readTwoBit.mockResolvedValue([]);
    expect(await fetchDynseq(createContext())).toEqual({ signal: scores, sequence: [] });
  });

  it.each(["wide", "dense"])(
    "uses BigWig zoom summaries without reference reads for %s demand",
    async (mode) => {
      const context = createContext();
      const demand = {
        ...context.demand,
        region: { chromosome: "chr1", start: 0, end: 10000 },
        width: 100,
      };
      const summaries = [
        { kind: "summary", chromosome: "chr1", start: 0, end: 10000, min: -2, max: 3 },
      ];
      const file = {
        read: reader.readBigWig,
        getZoomLevels: vi.fn().mockResolvedValue([10, 100]),
        readZoomLevel: vi.fn().mockResolvedValue(summaries),
      };
      reader.createBigWigFile.mockReturnValue(file);
      const data = await fetchDynseq({
        ...context,
        demand,
        track: {
          ...context.track,
          base: { ...context.track.base, display: mode === "dense" ? "dense" : "full" },
          // Dense must still use the signal reader when letters would be eligible.
          config: { ...context.track.config, minPixelsPerBase: mode === "dense" ? 0.001 : 3 },
        },
      });
      expect(data).toEqual({ signal: summaries, sequence: [] });
      expect(file.readZoomLevel).toHaveBeenCalledTimes(1);
      // Reader request options belong to the shared fetcher. This scenario checks
      // that dynseq selects the correct region and summary resolution.
      expect(file.readZoomLevel.mock.calls[0]?.slice(0, 2)).toEqual([demand.region, 10]);
      expect(reader.readBigWig).not.toHaveBeenCalled();
      expect(reader.createTwoBitFile).not.toHaveBeenCalled();
    },
  );

  it("reuses one reader per source across reads", async () => {
    reader.readBigWig.mockResolvedValue([]);
    reader.readTwoBit.mockResolvedValue([
      { chromosome: "chr1", start: 100, end: 110, sequence: "ACGTACGTAC" },
    ]);
    const resources = createResources();
    await fetchDynseq(createContext(resources));
    await fetchDynseq(createContext(resources));
    expect(reader.createBigWigFile).toHaveBeenCalledTimes(1);
    expect(reader.createTwoBitFile).toHaveBeenCalledTimes(1);
  });
});
