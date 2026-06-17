import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createFetchSignature, fetchOnChange } from "../../src/modules/fetchOnChange";
import { defineTrackModule } from "../../src/modules/defineTrackModule";
import { bulkBedModule } from "../../src/tracks/bulkbed/module";

describe("fetchOnChange", () => {
  function Renderer() {
    return null;
  }

  it("includes only marked fields in fetch signatures", () => {
    const module = defineTrackModule({
      type: "example",
      schema: z.object({
        url: fetchOnChange(z.string().min(1)),
        colorBy: z.string().optional(),
      }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const config = module.create({
      id: "signal",
      title: "Signal",
      url: "YOUR_URL_HERE",
      colorBy: "score",
    });

    expect(createFetchSignature(module, config)).toBe(JSON.stringify({ url: "YOUR_URL_HERE" }));
    expect(createFetchSignature(module, { ...config, colorBy: "name" })).toBe(
      createFetchSignature(module, config),
    );
    expect(createFetchSignature(module, { ...config, url: "OTHER_URL" })).not.toBe(
      createFetchSignature(module, config),
    );
  });

  it("returns a stable empty signature when no fields are marked", () => {
    const module = defineTrackModule({
      type: "unmarked",
      schema: z.object({ url: z.string().min(1) }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const config = module.create({ id: "signal", title: "Signal", url: "YOUR_URL_HERE" });

    expect(createFetchSignature(module, config)).toBe("{}");
    expect(createFetchSignature(module, { ...config, url: "OTHER_URL" })).toBe("{}");
  });

  it("preserves nested object shape for marked fields", () => {
    const module = defineTrackModule({
      type: "nested",
      schema: z.object({
        source: z.object({
          url: fetchOnChange(z.string().min(1)),
          label: z.string().min(1),
        }),
      }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const config = module.create({
      id: "signal",
      title: "Signal",
      source: { url: "YOUR_URL_HERE", label: "Signal A" },
    });

    expect(createFetchSignature(module, config)).toBe(
      JSON.stringify({ source: { url: "YOUR_URL_HERE" } }),
    );
    expect(
      createFetchSignature(module, { ...config, source: { ...config.source, label: "Signal B" } }),
    ).toBe(createFetchSignature(module, config));
    expect(
      createFetchSignature(module, { ...config, source: { ...config.source, url: "OTHER_URL" } }),
    ).not.toBe(createFetchSignature(module, config));
  });

  it("preserves nested array shape for marked fields", () => {
    const module = defineTrackModule({
      type: "bulk-example",
      schema: z.object({
        datasets: z.array(
          z.object({
            name: z.string().min(1),
            url: fetchOnChange(z.string().min(1)),
          }),
        ),
      }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const config = module.create({
      id: "bulk-signal",
      title: "Bulk signal",
      datasets: [
        { name: "Dataset A", url: "URL_A" },
        { name: "Dataset B", url: "URL_B" },
      ],
    });

    expect(createFetchSignature(module, config)).toBe(
      JSON.stringify({ datasets: [{ url: "URL_A" }, { url: "URL_B" }] }),
    );
    expect(
      createFetchSignature(module, {
        ...config,
        datasets: [{ name: "Dataset C", url: "URL_A" }, config.datasets[1]],
      }),
    ).toBe(createFetchSignature(module, config));
    expect(
      createFetchSignature(module, {
        ...config,
        datasets: [{ name: "Dataset A", url: "URL_C" }, config.datasets[1]],
      }),
    ).not.toBe(createFetchSignature(module, config));
    expect(
      createFetchSignature(module, {
        ...config,
        datasets: [config.datasets[1], config.datasets[0]],
      }),
    ).not.toBe(createFetchSignature(module, config));
  });

  it("includes bulkbed dataset urls in fetch signatures", () => {
    const config = bulkBedModule.create({
      id: "bulk-peaks",
      title: "Bulk peaks",
      datasets: [
        { name: "Dataset A", url: "URL_A" },
        { name: "Dataset B", url: "URL_B" },
      ],
    });

    expect(createFetchSignature(bulkBedModule, config)).toBe(
      JSON.stringify({ datasets: [{ url: "URL_A" }, { url: "URL_B" }] }),
    );
    expect(
      createFetchSignature(bulkBedModule, {
        ...config,
        datasets: [{ name: "Dataset C", url: "URL_A" }, config.datasets[1]],
      }),
    ).toBe(createFetchSignature(bulkBedModule, config));
    expect(
      createFetchSignature(bulkBedModule, {
        ...config,
        datasets: [{ name: "Dataset A", url: "URL_C" }, config.datasets[1]],
      }),
    ).not.toBe(createFetchSignature(bulkBedModule, config));
  });
});
