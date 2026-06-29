import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createFetchSignature, fetchOnChange } from "../../src/modules/fetchOnChange";
import { defineTrackModule } from "../../src/modules/defineTrackModule";
import { bulkBedModule } from "../../src/tracks/bulkbed/module";

describe("fetchOnChange", () => {
  function Renderer() {
    return null;
  }

  it("includes only marked config fields in fetch signatures", () => {
    const module = defineTrackModule({
      type: "example",
      configSchema: z.object({
        url: fetchOnChange(z.string().min(1)),
        colorBy: z.string().optional(),
      }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const track = module.create({
      id: "signal",
      title: "Signal",
      url: "YOUR_URL_HERE",
      colorBy: "score",
    });

    expect(createFetchSignature(module, track)).toBe(JSON.stringify({ url: "YOUR_URL_HERE" }));
    expect(
      createFetchSignature(module, {
        ...track,
        config: { ...track.config, colorBy: "name" },
      }),
    ).toBe(createFetchSignature(module, track));
    expect(
      createFetchSignature(module, {
        ...track,
        config: { ...track.config, url: "OTHER_URL" },
      }),
    ).not.toBe(createFetchSignature(module, track));
  });

  it("ignores base and interaction changes", () => {
    const module = defineTrackModule({
      type: "visual",
      configSchema: z.object({ url: fetchOnChange(z.string().min(1)) }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const track = module.create({ id: "signal", title: "Signal", url: "YOUR_URL_HERE" });

    expect(
      createFetchSignature(module, {
        ...track,
        base: { ...track.base, color: "#000000", height: 100 },
        interaction: { onClick: () => undefined },
      }),
    ).toBe(createFetchSignature(module, track));
  });

  it("returns a stable empty signature when no fields are marked", () => {
    const module = defineTrackModule({
      type: "unmarked",
      configSchema: z.object({ url: z.string().min(1) }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const track = module.create({ id: "signal", title: "Signal", url: "YOUR_URL_HERE" });

    expect(createFetchSignature(module, track)).toBe("{}");
    expect(
      createFetchSignature(module, { ...track, config: { ...track.config, url: "OTHER_URL" } }),
    ).toBe("{}");
  });

  it("preserves nested object shape for marked fields", () => {
    const module = defineTrackModule({
      type: "nested",
      configSchema: z.object({
        source: z.object({
          url: fetchOnChange(z.string().min(1)),
          label: z.string().min(1),
        }),
      }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const track = module.create({
      id: "signal",
      title: "Signal",
      source: { url: "YOUR_URL_HERE", label: "Signal A" },
    });

    expect(createFetchSignature(module, track)).toBe(
      JSON.stringify({ source: { url: "YOUR_URL_HERE" } }),
    );
    expect(
      createFetchSignature(module, {
        ...track,
        config: { source: { ...track.config.source, label: "Signal B" } },
      }),
    ).toBe(createFetchSignature(module, track));
    expect(
      createFetchSignature(module, {
        ...track,
        config: { source: { ...track.config.source, url: "OTHER_URL" } },
      }),
    ).not.toBe(createFetchSignature(module, track));
  });

  it("preserves nested array shape for marked fields", () => {
    const module = defineTrackModule({
      type: "bulk-example",
      configSchema: z.object({
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
    const track = module.create({
      id: "bulk-signal",
      title: "Bulk signal",
      datasets: [
        { name: "Dataset A", url: "URL_A" },
        { name: "Dataset B", url: "URL_B" },
      ],
    });

    expect(createFetchSignature(module, track)).toBe(
      JSON.stringify({ datasets: [{ url: "URL_A" }, { url: "URL_B" }] }),
    );
    expect(
      createFetchSignature(module, {
        ...track,
        config: {
          datasets: [{ name: "Dataset C", url: "URL_A" }, track.config.datasets[1]],
        },
      }),
    ).toBe(createFetchSignature(module, track));
    expect(
      createFetchSignature(module, {
        ...track,
        config: {
          datasets: [{ name: "Dataset A", url: "URL_C" }, track.config.datasets[1]],
        },
      }),
    ).not.toBe(createFetchSignature(module, track));
    expect(
      createFetchSignature(module, {
        ...track,
        config: { datasets: [track.config.datasets[1], track.config.datasets[0]] },
      }),
    ).not.toBe(createFetchSignature(module, track));
  });

  it("includes bulkbed dataset urls in fetch signatures", () => {
    const track = bulkBedModule.create({
      id: "bulk-peaks",
      title: "Bulk peaks",
      datasets: [
        { name: "Dataset A", url: "URL_A" },
        { name: "Dataset B", url: "URL_B" },
      ],
    });

    expect(createFetchSignature(bulkBedModule, track)).toBe(
      JSON.stringify({ datasets: [{ url: "URL_A" }, { url: "URL_B" }] }),
    );
    expect(
      createFetchSignature(bulkBedModule, {
        ...track,
        config: {
          ...track.config,
          datasets: [{ name: "Dataset C", url: "URL_A" }, track.config.datasets[1]],
        },
      }),
    ).toBe(createFetchSignature(bulkBedModule, track));
    expect(
      createFetchSignature(bulkBedModule, {
        ...track,
        config: {
          ...track.config,
          datasets: [{ name: "Dataset A", url: "URL_C" }, track.config.datasets[1]],
        },
      }),
    ).not.toBe(createFetchSignature(bulkBedModule, track));
  });
});
