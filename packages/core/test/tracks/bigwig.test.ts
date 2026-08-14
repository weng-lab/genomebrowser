import { beforeEach, describe, expect, it, vi } from "vitest";

const reader = vi.hoisted(() => ({
  read: vi.fn(),
  createBigWigFile: vi.fn(),
}));

vi.mock("@weng-lab/genomic-reader", () => ({
  createBigWigFile: reader.createBigWigFile,
}));

import { fetchBigWigRaw } from "../../src/tracks/bigwig/fetch";

describe("BigWig track fetching", () => {
  beforeEach(() => {
    reader.read.mockReset();
    reader.createBigWigFile.mockReset();
    reader.createBigWigFile.mockReturnValue({ read: reader.read });
  });

  it("reads unzoomed records and adapts them to the existing track data shape", async () => {
    const region = { chromosome: "chr1", start: 10, end: 20 };
    reader.read.mockResolvedValue([
      { kind: "value", chromosome: "chr1", start: 12, end: 18, value: 2.5 },
    ]);

    await expect(fetchBigWigRaw({ url: "https://example.org/data.bw", region })).resolves.toEqual([
      { chr: "chr1", start: 12, end: 18, value: 2.5 },
    ]);

    expect(reader.createBigWigFile).toHaveBeenCalledWith({
      url: "https://example.org/data.bw",
    });
    expect(reader.read).toHaveBeenCalledWith(region, {
      resolution: { mode: "unzoomed" },
    });
  });
});
