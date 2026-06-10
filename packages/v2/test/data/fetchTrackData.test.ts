import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fetchTrackData } from "../../src/data/fetchTrackData";
import { defineTrackModule } from "../../src/modules/defineTrackModule";
import { createModuleRegistry } from "../../src/modules/registry";

describe("fetchTrackData", () => {
  const region = { chromosome: "chr1", start: 0, end: 10 };

  function Renderer() {
    return null;
  }

  it("returns success data", async () => {
    const module = defineTrackModule({
      type: "example",
      schema: z.object({ url: z.string().min(1) }),
      fetch: async ({ config }) => [{ url: config.url }],
      render: { full: Renderer },
    });
    const registry = createModuleRegistry([module]);

    await expect(
      fetchTrackData({
        registry,
        track: module.create({
          id: "signal",
          title: "Signal",
          url: "YOUR_URL_HERE",
        }),
        region,
      }),
    ).resolves.toEqual({ status: "success", data: [{ url: "YOUR_URL_HERE" }] });
  });

  it("returns errors for missing modules, invalid configs, and fetch failures", async () => {
    const module = defineTrackModule({
      type: "example",
      schema: z.object({ url: z.string().min(1) }),
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
          id: "missing",
          type: "missing",
          title: "Missing",
          display: "full",
          height: 80,
        },
        region,
      }),
    ).resolves.toMatchObject({
      status: "error",
      error: "No track module registered for type: missing",
    });

    await expect(
      fetchTrackData({
        registry,
        track: {
          id: "bad",
          type: "example",
          title: "Bad",
          display: "full",
          height: 80,
        },
        region,
      }),
    ).resolves.toMatchObject({ status: "error" });

    await expect(
      fetchTrackData({
        registry,
        track: module.create({
          id: "signal",
          title: "Signal",
          url: "YOUR_URL_HERE",
        }),
        region,
      }),
    ).resolves.toEqual({ status: "error", error: "Fetch failed" });
  });
});
