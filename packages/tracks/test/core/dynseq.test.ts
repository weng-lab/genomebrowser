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
    expect(track.base).toMatchObject({ display: "full", height: 100, color: "#3a6ea5" });
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
  it("pairs each scored base with the reference base at the same coordinate", async () => {
    reader.readBigWig.mockResolvedValue([
      { kind: "value", chromosome: "chr1", start: 100, end: 103, value: 0.5 },
      { kind: "value", chromosome: "chr1", start: 104, end: 105, value: -2 },
    ]);
    reader.readTwoBit.mockResolvedValue([
      { chromosome: "chr1", start: 100, end: 110, sequence: "ACGTacgtAC" },
    ]);

    expect(await fetchDynseq(createContext())).toEqual([
      { position: 100, score: 0.5, base: "A" },
      { position: 101, score: 0.5, base: "C" },
      { position: 102, score: 0.5, base: "G" },
      { position: 104, score: -2, base: "a" },
    ]);
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

  it("drops scores with no reference base to sit on", async () => {
    reader.readBigWig.mockResolvedValue([
      { kind: "value", chromosome: "chr1", start: 98, end: 102, value: 1 },
    ]);
    reader.readTwoBit.mockResolvedValue([
      { chromosome: "chr1", start: 100, end: 110, sequence: "ACGTACGTAC" },
    ]);
    // 98 and 99 precede the sequence record and are skipped rather than shifted.
    expect(await fetchDynseq(createContext())).toEqual([
      { position: 100, score: 1, base: "A" },
      { position: 101, score: 1, base: "C" },
    ]);
  });

  it("returns nothing when the reference has no sequence for the region", async () => {
    reader.readBigWig.mockResolvedValue([
      { kind: "value", chromosome: "chr1", start: 100, end: 101, value: 1 },
    ]);
    reader.readTwoBit.mockResolvedValue([]);
    expect(await fetchDynseq(createContext())).toEqual([]);
  });

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
