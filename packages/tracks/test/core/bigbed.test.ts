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
import { fetchBigBedRows } from "../../src/bigbed/fetch";
import { bigBedModule } from "../../src/bigbed";

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
  });

  it("reads BigBed records with the genomic reader BED3 schema", async () => {
    const region = { chromosome: "chr1", start: 10, end: 20 };
    const records = [{ chromosome: "chr1", start: 12, end: 18, fields: ["feature"] }];
    reader.read.mockResolvedValue(records);

    await expect(fetchBigBedRows({ url: "https://example.org/data.bb", region })).resolves.toBe(
      records,
    );

    expect(reader.createBigBedFile).toHaveBeenCalledWith({
      url: "https://example.org/data.bb",
      schema: bed3Schema,
    });
    expect(reader.read).toHaveBeenCalledWith(region);
  });
});
