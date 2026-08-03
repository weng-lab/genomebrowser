import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createModuleRegistry, defineTrackModule } from "@weng-lab/genomebrowser";
import { createCollectionSchema } from "../src/TrackSelect/schema/collectionSchema";
import { generateTrackCollectionJsonSchema } from "../src/TrackSelect/schema/generateJsonSchema";
import { validateJson } from "../src/TrackSelect/schema/validateJson";

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

  const registry = createModuleRegistry([signalModule]);

  const validCollection = {
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
        type: "signal",
        id: "signal-1",
        title: "Signal 1",
        display: "dense",
        config: { url: "YOUR_URL_HERE" },
        metadata: { assay: "signal" },
      },
    ],
  };

  it("validates registry-derived collection entries", () => {
    expect(validateJson(validCollection, registry).tracks[0]).toEqual({
      type: "signal",
      id: "signal-1",
      title: "Signal 1",
      display: "dense",
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
        registry,
      ),
    ).toThrow(/TrackSelect collection is invalid/);

    expect(() =>
      validateJson(
        {
          ...validCollection,
          tracks: [{ ...validCollection.tracks[0], config: {} }],
        },
        registry,
      ),
    ).toThrow(/TrackSelect collection is invalid/);
  });

  it("generates display enum values in JSON schema", () => {
    const schema = generateTrackCollectionJsonSchema(registry);

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
    const defaultedRegistry = createModuleRegistry([defaultedModule]);
    const collection = {
      ...validCollection,
      tracks: [
        {
          type: "defaulted-signal",
          id: "signal-1",
          title: "Signal 1",
          config: { assembly: "hg38" },
          metadata: { assay: "signal" },
        },
      ],
    };

    expect(validateJson(collection, defaultedRegistry).tracks[0]).toEqual({
      type: "defaulted-signal",
      id: "signal-1",
      title: "Signal 1",
      config: { assembly: "hg38" },
      metadata: { assay: "signal" },
    });
    expect(() =>
      validateJson(
        {
          ...collection,
          tracks: [{ ...collection.tracks[0], config: {} }],
        },
        defaultedRegistry,
      ),
    ).toThrow(/TrackSelect collection is invalid/);

    const schema = generateTrackCollectionJsonSchema(defaultedRegistry) as {
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
    expect(() => createCollectionSchema(createModuleRegistry([]))).toThrow(
      /At least one track module is required/,
    );
  });
});
