import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createTrackStore, defineTrackModule } from "../src/lib";
import { createTrackCollectionSchema } from "../src/lib";
import { generateTrackCollectionJsonSchema } from "../src/lib";
import { validateJson } from "../src/lib";

describe("TrackSelect collection schemas", () => {
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

  const registry = createTrackStore({ modules: [signalModule] }).getState().registry;

  const validCollection = {
    assembly: "hg38",
    id: "catalog",
    label: "Collection",
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
        base: {
          id: "signal-1",
          title: "Signal 1",
          display: "dense",
        },
        type: "signal",
        config: { url: "YOUR_URL_HERE" },
        metadata: { assay: "signal" },
      },
    ],
  };

  it("validates registry-derived collection entries", () => {
    expect(validateJson(validCollection, registry.modules).tracks[0]).toEqual({
      base: {
        id: "signal-1",
        title: "Signal 1",
        display: "dense",
      },
      type: "signal",
      config: {
        url: "YOUR_URL_HERE",
      },
      metadata: { assay: "signal" },
    });
  });

  it("rejects unknown track types and invalid nested config", () => {
    expect(() =>
      validateJson(
        {
          ...validCollection,
          tracks: [{ ...validCollection.tracks[0], type: "missing" }],
        },
        registry.modules,
      ),
    ).toThrow(/Track collection is invalid/);

    expect(() =>
      validateJson(
        {
          ...validCollection,
          tracks: [{ ...validCollection.tracks[0], config: {} }],
        },
        registry.modules,
      ),
    ).toThrow(/Track collection is invalid/);
  });

  it("does not allow collection authors to set the runtime track source", () => {
    expect(() =>
      validateJson(
        {
          ...validCollection,
          tracks: [{ ...validCollection.tracks[0], source: "user" }],
        },
        registry.modules,
      ),
    ).toThrow(/Track collection is invalid/);

    const schema = generateTrackCollectionJsonSchema(registry.modules) as {
      properties?: {
        tracks?: { items?: { oneOf?: Array<{ properties?: Record<string, unknown> }> } };
      };
    };
    expect(schema.properties?.tracks?.items?.oneOf?.[0]?.properties).not.toHaveProperty("source");
  });

  it("generates display enum values in JSON schema", () => {
    const schema = generateTrackCollectionJsonSchema(registry.modules);

    expect(schema).toMatchObject({
      properties: {
        tracks: {
          items: {
            oneOf: [
              {
                properties: {
                  base: { properties: { display: { enum: ["full", "dense"] } } },
                },
              },
            ],
          },
        },
      },
    });
  });

  it("honors Zod config defaults at the collection validation boundary", () => {
    const defaultedModule = defineTrackModule({
      type: "defaulted-signal",
      configSchema: z.object({
        url: z.string().min(1).default("YOUR_URL_HERE"),
        assembly: z.string().min(1),
        scale: z.enum(["auto", "fixed"]).default("auto"),
      }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const defaultedRegistry = createTrackStore({ modules: [defaultedModule] }).getState().registry;
    const collection = {
      ...validCollection,
      tracks: [
        {
          base: {
            id: "signal-1",
            title: "Signal 1",
          },
          type: "defaulted-signal",
          config: { assembly: "hg38" },
          metadata: { assay: "signal" },
        },
      ],
    };

    expect(validateJson(collection, defaultedRegistry.modules).tracks[0]).toEqual({
      base: {
        id: "signal-1",
        title: "Signal 1",
      },
      type: "defaulted-signal",
      config: { assembly: "hg38" },
      metadata: { assay: "signal" },
    });
    expect(() =>
      validateJson(
        {
          ...collection,
          tracks: [{ ...collection.tracks[0], config: {} }],
        },
        defaultedRegistry.modules,
      ),
    ).toThrow(/Track collection is invalid/);

    const schema = generateTrackCollectionJsonSchema(defaultedRegistry.modules) as {
      properties?: {
        tracks?: {
          items?: {
            oneOf?: Array<{
              properties?: {
                config?: { required?: string[] };
              };
            }>;
          };
        };
      };
    };
    const configRequired =
      schema.properties?.tracks?.items?.oneOf?.[0]?.properties?.config?.required ?? [];
    expect(configRequired).toContain("assembly");
    expect(configRequired).not.toContain("url");
  });

  it("rejects empty registries", () => {
    expect(() => createTrackCollectionSchema([])).toThrow(/At least one track module is required/);
  });
});
