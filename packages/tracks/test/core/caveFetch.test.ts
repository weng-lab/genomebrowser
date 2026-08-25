import { beforeEach, describe, expect, it, vi } from "vitest";

const reader = vi.hoisted(() => ({
  createBigWigFile: vi.fn(),
  getZoomLevels: vi.fn(),
  read: vi.fn(),
  readZoomLevel: vi.fn(),
}));

vi.mock("@weng-lab/genomic-reader", () => ({
  createBigWigFile: reader.createBigWigFile,
}));

import type { TrackResources } from "@weng-lab/genomebrowser";
import { fetchCave } from "../../src/cave/fetch";

describe("CAVE track fetching", () => {
  beforeEach(() => {
    reader.createBigWigFile.mockReset();
    reader.getZoomLevels.mockReset();
    reader.read.mockReset();
    reader.readZoomLevel.mockReset();
    reader.createBigWigFile.mockReturnValue({
      getZoomLevels: reader.getZoomLevels,
      read: reader.read,
      readZoomLevel: reader.readZoomLevel,
    });
    reader.getZoomLevels.mockResolvedValue([100, 400, 1_600]);
    reader.readZoomLevel.mockResolvedValue([]);
  });

  it("uses zoom summaries for both sources at wide regions", async () => {
    const region = { chromosome: "chr1", start: 0, end: 100_000 };

    await expect(
      fetchCave({
        track: {
          id: "cave",
          type: "cave",
          display: "full",
          config: {
            neurotransmitter: "GABA",
            age: "Adulthood",
            topColor: "#000000",
            bottomColor: "#000000",
          },
        },
        demand: {
          assembly: { id: "hg38", chromosomes: { chr1: 248_956_422 } },
          region,
          width: 100,
        },
        resources: createResources(),
      }),
    ).resolves.toEqual({ top: [], bottom: [] });

    expect(reader.createBigWigFile).toHaveBeenCalledTimes(2);
    expect(reader.readZoomLevel).toHaveBeenCalledTimes(2);
    expect(reader.readZoomLevel).toHaveBeenCalledWith(region, 400);
    expect(reader.read).not.toHaveBeenCalled();
  });
});

function createResources(): TrackResources {
  const values = new Map<string, unknown>();
  return {
    get: <T>(key: string) => values.get(key) as T | undefined,
    set: (key, value) => values.set(key, value),
    delete: (key) => values.delete(key),
    clear: () => values.clear(),
  };
}
