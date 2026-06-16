import { describe, expect, it } from "vitest";
import { bulkBedModule } from "../../src/tracks/bulkbed/module";

describe("BulkBed module", () => {
  it("creates a full-display bulkbed config", () => {
    const config = bulkBedModule.create({
      id: "bulk-peaks",
      title: "Bulk peaks",
      datasets: [
        { name: "Dataset A", url: "YOUR_URL_HERE" },
        { name: "Dataset B", url: "YOUR_URL_HERE" },
      ],
    });

    expect(config).toMatchObject({
      id: "bulk-peaks",
      type: "bulkbed",
      title: "Bulk peaks",
      display: "full",
      height: 80,
      color: "#4b9560",
      datasets: [
        { name: "Dataset A", url: "YOUR_URL_HERE" },
        { name: "Dataset B", url: "YOUR_URL_HERE" },
      ],
    });
  });

  it("requires at least one dataset", () => {
    expect(() =>
      bulkBedModule.create({
        id: "bulk-peaks",
        title: "Bulk peaks",
        datasets: [],
      }),
    ).toThrow(/bulkbed config/);
  });

  it("rejects negative gaps", () => {
    expect(() =>
      bulkBedModule.create({
        id: "bulk-peaks",
        title: "Bulk peaks",
        datasets: [{ name: "Dataset A", url: "YOUR_URL_HERE" }],
        gap: -1,
      }),
    ).toThrow(/bulkbed config/);
  });
});
