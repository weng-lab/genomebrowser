import { describe, expect, it } from "vitest";
import { bulkBedModule } from "../../src/tracks/bulkbed/module";

describe("BulkBed module", () => {
  it("creates a full-display bulkbed config", () => {
    const track = bulkBedModule.create({
      id: "bulk-peaks",
      title: "Bulk peaks",
      config: {
        datasets: [
          { name: "Dataset A", url: "YOUR_URL_HERE" },
          { name: "Dataset B", url: "YOUR_URL_HERE" },
        ],
      },
    });

    expect(track).toMatchObject({
      type: "bulkbed",
      base: {
        id: "bulk-peaks",
        title: "Bulk peaks",
        display: "full",
        height: 80,
        color: "#4b9560",
      },
      config: {
        datasets: [
          { name: "Dataset A", url: "YOUR_URL_HERE" },
          { name: "Dataset B", url: "YOUR_URL_HERE" },
        ],
      },
    });
    expect(bulkBedModule.tooltipComponent).toBeTypeOf("function");
    expect(track).not.toHaveProperty("tooltip");
  });

  it("requires at least one dataset", () => {
    expect(() =>
      bulkBedModule.create({
        id: "bulk-peaks",
        title: "Bulk peaks",
        config: { datasets: [] },
      }),
    ).toThrow(/bulkbed input/);
  });

  it("rejects negative gaps", () => {
    expect(() =>
      bulkBedModule.create({
        id: "bulk-peaks",
        title: "Bulk peaks",
        config: {
          datasets: [{ name: "Dataset A", url: "YOUR_URL_HERE" }],
          gap: -1,
        },
      }),
    ).toThrow(/bulkbed input/);
  });
});
