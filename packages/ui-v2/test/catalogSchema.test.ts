import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createModuleRegistry,
  defineTrackModule,
} from "../../v2/src/lib";
import { createCatalogSchema } from "../src/TrackSelect/schema/catalogSchema";
import { generateTrackCatalogJsonSchema } from "../src/TrackSelect/schema/generateJsonSchema";
import { validateJson } from "../src/TrackSelect/schema/validateJson";

describe("TrackSelect catalog schemas", () => {
  function Renderer() {
    return null;
  }

  const signalModule = defineTrackModule({
    type: "signal",
    configSchema: z.object({
      url: z.string().min(1),
      scale: z.enum(["auto", "fixed"]).default("auto"),
    }),
    fetch: async () => null,
    render: {
      full: Renderer,
      dense: Renderer,
    },
  });

  const registry = createModuleRegistry([signalModule]);

  const validCatalog = {
    id: "catalog",
    label: "Catalog",
    views: [
      {
        id: "default",
        label: "Default",
        columns: [{ field: "assay" }],
        leaf: "title",
      },
    ],
    tracks: [
      {
        type: "signal",
        id: "signal-1",
        title: "Signal 1",
        display: "dense",
        config: { url: "YOUR_URL_HERE" },
        metadata: { assay: "signal" },
      },
    ],
  };

  it("validates registry-derived catalog entries", () => {
    expect(validateJson(validCatalog, registry).tracks[0]).toMatchObject({
      type: "signal",
      id: "signal-1",
      display: "dense",
      config: {
        url: "YOUR_URL_HERE",
        scale: "auto",
      },
      metadata: { assay: "signal" },
    });
  });

  it("rejects unknown track types and invalid nested config", () => {
    expect(() =>
      validateJson(
        {
          ...validCatalog,
          tracks: [{ ...validCatalog.tracks[0], type: "missing" }],
        },
        registry,
      ),
    ).toThrow(/TrackSelect catalog is invalid/);

    expect(() =>
      validateJson(
        {
          ...validCatalog,
          tracks: [{ ...validCatalog.tracks[0], config: {} }],
        },
        registry,
      ),
    ).toThrow(/TrackSelect catalog is invalid/);
  });

  it("generates display enum values in JSON schema", () => {
    const schema = generateTrackCatalogJsonSchema(registry);

    expect(schema).toMatchObject({
      properties: {
        tracks: {
          items: {
            oneOf: [
              {
                properties: {
                  display: {
                    enum: ["full", "dense"],
                  },
                },
              },
            ],
          },
        },
      },
    });
  });

  it("rejects empty registries", () => {
    expect(() => createCatalogSchema(createModuleRegistry([]))).toThrow(
      /At least one track module is required/,
    );
  });
});
