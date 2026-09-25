import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTrackStore,
  type TrackResources,
  type TrackFetchContext,
} from "@weng-lab/genomebrowser";
import { bamModule, type BamConfig } from "@weng-lab/genomebrowser-tracks/bam";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";

const mocks = vi.hoisted(() => ({ createBamFile: vi.fn(), createTwoBitFile: vi.fn() }));
vi.mock("@weng-lab/genomic-reader", async (original) => ({
  ...(await original<typeof import("@weng-lab/genomic-reader")>()),
  ...mocks,
}));
const input = {
  base: { id: "bam", title: "Alignments" },
  config: { url: "YOUR_URL_HERE", indexUrl: "YOUR_URL_HERE" },
};
function resources(): TrackResources {
  const map = new Map<string, unknown>();
  return {
    get: <T>(key: string) => map.get(key) as T | undefined,
    set: (key, value) => {
      map.set(key, value);
    },
    delete: (key) => {
      map.delete(key);
    },
    clear: () => map.clear(),
  };
}
const region = { chromosome: "chr1", start: 100, end: 110 };
function context(
  cache: TrackResources,
  config: Partial<BamConfig> = {},
  width = 150,
): TrackFetchContext<BamConfig> {
  return {
    track: { ...bamModule.create(input), config: { ...bamModule.create(input).config, ...config } },
    demand: {
      region,
      visibleRegion: region,
      width,
      assembly: { id: "test", chromosomes: { chr1: 1000000 } },
    },
    resources: cache,
  };
}
beforeEach(() => vi.resetAllMocks());
describe("BAM module public contract", () => {
  it("defaults omitted and partial groups and preserves siblings in nested updates", () => {
    const defaults = bamModule.create(input).config;
    expect(
      bamModule.create({ ...input, config: { ...input.config, alignments: {}, filters: {} } })
        .config,
    ).toEqual(defaults);
    const track = bamModule.create({
      ...input,
      config: {
        ...input.config,
        alignments: { rowHeight: 24 },
        filters: { minimumMappingQuality: 20 },
      },
    });
    const store = createTrackStore({ modules: [bamModule], tracks: [track] });
    expect(
      store.getState().updateTrack("bam", {
        config: {
          alignments: { forwardColor: "#123456" },
          filters: { includeDuplicates: false },
        },
      }).ok,
    ).toBe(true);
    expect(store.getState().getTrack("bam")?.config).toEqual({
      ...defaults,
      alignments: { ...defaults.alignments, rowHeight: 24, forwardColor: "#123456" },
      filters: { minimumMappingQuality: 20, includeDuplicates: false },
    });
    expect(
      store.getState().updateTrack("bam", { config: { alignments: { sequenceMaxWindow: 0 } } }).ok,
    ).toBe(false);
  });
  it("registers all four displays, applies defaults, and validates updates", () => {
    expect(firstPartyTrackModules).toContain(bamModule);
    expect(bamModule.displays).toEqual(["dense", "squish", "pack", "full"]);
    const track = bamModule.create(input);
    expect(track).toMatchObject({
      type: "bam",
      base: { display: "pack", color: "#3366cc", height: 14 },
      config: {
        alignments: {
          rowHeight: 14,
          forwardColor: "#3366cc",
          reverseColor: "#cc3333",
          sequenceMaxWindow: 100,
        },
        filters: { minimumMappingQuality: 0, includeDuplicates: true },
        maxWindow: 50000,
      },
    });
    expect(
      bamModule.create({ ...input, config: { ...input.config, maxWindow: 100000 } }).config
        .maxWindow,
    ).toBe(100000);
    for (const maxWindow of [0, 1.5, 100001]) {
      expect(() =>
        bamModule.create({ ...input, config: { ...input.config, maxWindow } }),
      ).toThrow();
    }
    expect(track.config).not.toHaveProperty("maxVisibleWindow");
    const useTracks = createTrackStore({ modules: [bamModule], tracks: [track] });
    for (const display of bamModule.displays)
      expect(useTracks.getState().updateTrack("bam", { base: { display } }).ok).toBe(true);
    expect(useTracks.getState().updateTrack("bam", { base: { display: "invalid" } }).ok).toBe(
      false,
    );
    expect(
      useTracks
        .getState()
        .updateTrack("bam", { config: { filters: { minimumMappingQuality: 255 } } }).ok,
    ).toBe(false);
    expect(() =>
      bamModule.create({ ...input, config: { ...input.config, alignments: { rowHeight: 0 } } }),
    ).toThrow();
    expect(() =>
      bamModule.create({ ...input, config: { ...input.config, indexUrl: "" } }),
    ).toThrow();
    expect(() =>
      bamModule.create({ ...input, config: { ...input.config, sequenceUrl: "file:///ref.2bit" } }),
    ).toThrow();
  });
  it("reuses readers by both BAM and BAI URL and isolates track resources", async () => {
    const records = [{ readName: "read" }];
    const read = vi.fn().mockResolvedValue(records);
    mocks.createBamFile.mockReturnValue({ read });
    const cache = resources();
    expect(await bamModule.fetch(context(cache))).toEqual({ records, reference: [] });
    await bamModule.fetch(context(cache));
    expect(mocks.createBamFile).toHaveBeenCalledTimes(1);
    await bamModule.fetch(context(cache, { indexUrl: "SECOND_INDEX" }));
    await bamModule.fetch(context(cache, { url: "SECOND_BAM", indexUrl: "SECOND_INDEX" }));
    await bamModule.fetch(context(resources()));
    expect(mocks.createBamFile).toHaveBeenCalledTimes(4);
    expect(read).toHaveBeenCalledWith(region);
    expect(mocks.createTwoBitFile).not.toHaveBeenCalled();
  });
  it.each([5, 10])("does not fetch visible regions at or above the limit %i", async (maxWindow) => {
    const result = await bamModule.fetch(context(resources(), { maxWindow }));
    expect(result.records).toEqual([]);
    expect(result.message).toContain("Zoom in");
    expect(mocks.createBamFile).not.toHaveBeenCalled();
  });
  it("loads reference independently of letter visibility, caches it, and keeps reads on reference failure", async () => {
    const records = [{ readName: "read" }];
    mocks.createBamFile.mockReturnValue({ read: vi.fn().mockResolvedValue(records) });
    const reference = [{ ...region, sequence: "ACGTACGTAC" }];
    const read = vi.fn().mockResolvedValue(reference);
    mocks.createTwoBitFile.mockReturnValue({ read });
    const cache = resources();
    const config = { sequenceUrl: "https://example.test/reference.2bit" };
    expect(await bamModule.fetch(context(cache, config, 1))).toEqual({ records, reference });
    expect(await bamModule.fetch(context(cache, config, 150))).toEqual({ records, reference });
    await bamModule.fetch(context(cache, config));
    expect(mocks.createTwoBitFile).toHaveBeenCalledTimes(1);
    await bamModule.fetch(context(cache, { sequenceUrl: "https://example.test/other.2bit" }));
    expect(mocks.createTwoBitFile).toHaveBeenCalledTimes(2);
    read.mockRejectedValueOnce(new Error("Reference unavailable"));
    expect(await bamModule.fetch(context(cache, config))).toMatchObject({
      records,
      reference: [],
      referenceError: "Reference unavailable",
    });
    read.mockResolvedValueOnce([]);
    expect((await bamModule.fetch(context(cache, config))).referenceError).toContain("not found");
  });
  it("surfaces BAM errors and allows retry without replacing a healthy reader", async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error("Invalid BAI")).mockResolvedValue([]);
    mocks.createBamFile.mockReturnValue({ read });
    const cache = resources();
    await expect(bamModule.fetch(context(cache))).rejects.toThrow("Invalid BAI");
    expect(await bamModule.fetch(context(cache))).toEqual({ records: [], reference: [] });
    expect(mocks.createBamFile).toHaveBeenCalledTimes(1);
  });
});
