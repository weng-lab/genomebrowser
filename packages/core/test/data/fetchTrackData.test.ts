import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fetchTrackData } from "../../src/browser/data/fetchTrackData";
import { createTrackResourceStore } from "../../src/browser/data/trackResourceStore";
import { defineTrackModule } from "../../src/modules/defineTrackModule";
import { createModuleRegistry } from "../../src/modules/registry";

describe("fetchTrackData", () => {
  const assembly = { id: "test", chromosomes: { chr1: 1_000 } };
  const region = { chromosome: "chr1", start: 0, end: 10 };
  const width = 100;

  function Renderer() {
    return null;
  }

  it("returns success data", async () => {
    const module = defineTrackModule({
      type: "example",
      configSchema: z.object({ url: z.string().min(1) }),
      fetch: async ({ track, demand }) => [
        {
          url: track.config.url,
          trackId: track.id,
          assembly: demand.assembly.id,
          width: demand.width,
        },
      ],
      render: { full: Renderer },
    });
    const registry = createModuleRegistry([module]);

    await expect(
      fetchTrackData({
        registry,
        resourceStore: createTrackResourceStore(),
        track: module.create({
          id: "signal",
          title: "Signal",
          config: { url: "YOUR_URL_HERE" },
        }),
        assembly,
        region,
        width,
      }),
    ).resolves.toEqual({
      status: "success",
      data: [{ url: "YOUR_URL_HERE", trackId: "signal", assembly: "test", width: 100 }],
    });
  });

  it("returns errors for missing modules and fetch failures", async () => {
    const module = defineTrackModule({
      type: "example",
      configSchema: z.object({ url: z.string().min(1) }),
      fetch: async () => {
        throw new Error("Fetch failed");
      },
      render: { full: Renderer },
    });
    const registry = createModuleRegistry([module]);

    await expect(
      fetchTrackData({
        registry,
        resourceStore: createTrackResourceStore(),
        track: {
          type: "missing",
          base: {
            id: "missing",
            title: "Missing",
            display: "full",
            height: 80,
            color: "#000000",
          },
          config: {},
          source: "user",
        },
        assembly,
        region,
        width,
      }),
    ).resolves.toMatchObject({
      status: "error",
      error: "No track module registered for type: missing",
    });

    await expect(
      fetchTrackData({
        registry,
        resourceStore: createTrackResourceStore(),
        track: module.create({
          id: "signal",
          title: "Signal",
          config: { url: "YOUR_URL_HERE" },
        }),
        assembly,
        region,
        width,
      }),
    ).resolves.toEqual({ status: "error", error: "Fetch failed" });
  });

  it("exposes resources that persist across fetches of the same track", async () => {
    const module = defineTrackModule({
      type: "example",
      configSchema: z.object({}),
      fetch: async ({ resources }) => {
        const count = resources.get<number>("count") ?? 0;
        resources.set("count", count + 1);
        return count + 1;
      },
      render: { full: Renderer },
    });
    const registry = createModuleRegistry([module]);
    const resourceStore = createTrackResourceStore();
    const track = module.create({ id: "signal", title: "Signal", config: {} });

    await expect(
      fetchTrackData({ registry, resourceStore, track, assembly, region, width }),
    ).resolves.toEqual({ status: "success", data: 1 });
    await expect(
      fetchTrackData({ registry, resourceStore, track, assembly, region, width }),
    ).resolves.toEqual({ status: "success", data: 2 });
    await expect(
      fetchTrackData({ registry, resourceStore, track, assembly, region, width }),
    ).resolves.toEqual({ status: "success", data: 3 });
  });

  it("isolates resource scopes between tracks sharing a module", async () => {
    const module = defineTrackModule({
      type: "example",
      configSchema: z.object({ url: z.string().min(1) }),
      fetch: async ({ track, resources }) => {
        if (resources.get("seen")) return "reused";
        resources.set("seen", true);
        return `first-${track.id}`;
      },
      render: { full: Renderer },
    });
    const registry = createModuleRegistry([module]);
    const resourceStore = createTrackResourceStore();

    await expect(
      fetchTrackData({
        registry,
        resourceStore,
        track: module.create({ id: "signal", title: "Signal", config: { url: "a" } }),
        assembly,
        region,
        width,
      }),
    ).resolves.toEqual({ status: "success", data: "first-signal" });

    await expect(
      fetchTrackData({
        registry,
        resourceStore,
        track: module.create({ id: "genes", title: "Genes", config: { url: "b" } }),
        assembly,
        region,
        width,
      }),
    ).resolves.toEqual({ status: "success", data: "first-genes" });

    await expect(
      fetchTrackData({
        registry,
        resourceStore,
        track: module.create({ id: "signal", title: "Signal", config: { url: "a" } }),
        assembly,
        region,
        width,
      }),
    ).resolves.toEqual({ status: "success", data: "reused" });
  });
});
