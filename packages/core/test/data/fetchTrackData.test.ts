import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fetchTrackData } from "../../src/browser/data/fetchTrackData";
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
});
