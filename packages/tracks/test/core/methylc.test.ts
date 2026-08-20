import { beforeEach, describe, expect, it, vi } from "vitest";

const reader = vi.hoisted(() => ({
  read: vi.fn(),
  createBigWigFile: vi.fn(),
}));

vi.mock("@weng-lab/genomic-reader", () => ({
  createBigWigFile: reader.createBigWigFile,
}));

import { fetchMethylC } from "../../src/methylc/fetch";
import type { MethylCConfig } from "../../src/methylc/types";

describe("MethylC track fetching", () => {
  beforeEach(() => {
    reader.read.mockReset();
    reader.createBigWigFile.mockReset();
    reader.createBigWigFile.mockReturnValue({ read: reader.read });
    reader.read.mockResolvedValue([
      { kind: "value", chromosome: "chr1", start: 12, end: 18, value: 0.75 },
    ]);
  });

  it("reads every configured BigWig channel through the new genomic reader", async () => {
    const region = { chromosome: "chr1", start: 10, end: 20 };
    const config = createConfig((channel) => `https://example.org/${channel}.bw`);

    const result = await fetchMethylC({ config, region });

    expect(reader.createBigWigFile).toHaveBeenCalledTimes(8);
    expect(reader.createBigWigFile).toHaveBeenNthCalledWith(1, {
      url: "https://example.org/plus-cpg.bw",
    });
    expect(reader.createBigWigFile).toHaveBeenNthCalledWith(8, {
      url: "https://example.org/minus-depth.bw",
    });
    expect(reader.read).toHaveBeenCalledTimes(8);
    expect(reader.read).toHaveBeenCalledWith(region, {
      resolution: { mode: "unzoomed" },
    });
    expect(result).toHaveLength(8);
    expect(result[0]).toEqual([
      { kind: "value", chromosome: "chr1", start: 12, end: 18, value: 0.75 },
    ]);
  });

  it("does not create a reader for empty channel URLs", async () => {
    const config = createConfig(() => "");

    await expect(
      fetchMethylC({ config, region: { chromosome: "chr1", start: 10, end: 20 } }),
    ).resolves.toEqual([[], [], [], [], [], [], [], []]);
    expect(reader.createBigWigFile).not.toHaveBeenCalled();
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
