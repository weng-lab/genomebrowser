import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  createTrackStore,
  defineTrackModule,
  type TrackCollection,
  type TrackCollectionView,
} from "../src/lib";
import { generateTrackCollectionJsonSchema } from "../src/lib";
import { validateTrackCollection } from "../src/lib";

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
    expect(validateTrackCollection(validCollection, registry.modules).tracks[0]).toEqual({
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

  it("keeps module input types correlated and transforms authored config only at creation", () => {
    const transformedModule = defineTrackModule({
      type: "transformed",
      configSchema: z.object({
        value: z
          .string()
          .transform((value) => value.length)
          .pipe(z.number().min(2)),
        offset: z.number().transform((value) => value + 1),
        enabled: z.boolean().default(true),
      }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const modules = [signalModule, transformedModule] as const;
    type Entry = TrackCollection<typeof modules>["tracks"][number];
    type TransformedEntry = Extract<Entry, { type: "transformed" }>;
    expectTypeOf<TransformedEntry["config"]>().toEqualTypeOf<{
      value: string;
      offset: number;
      enabled?: boolean | undefined;
    }>();
    expectTypeOf<TransformedEntry["base"]["display"]>().toEqualTypeOf<"full" | undefined>();
    expectTypeOf<Entry>().not.toHaveProperty("source");
    expectTypeOf<Entry>().not.toHaveProperty("interaction");
    const authored = {
      assembly: "hg38",
      id: "typed",
      views: [{ id: "main", label: "Main", columns: [{ field: "title" }] }],
      tracks: [
        {
          type: "transformed",
          base: { id: "one", title: "One" },
          config: { value: "hello", offset: 1 },
        },
      ],
    } satisfies TrackCollection<typeof modules>;
    const validated = validateTrackCollection(authored, modules);
    expectTypeOf(validated.tracks).toEqualTypeOf<Entry[]>();
    expectTypeOf(validated.views).toEqualTypeOf<TrackCollectionView[] | undefined>();
    expect(validated.tracks).toBe(authored.tracks);
    expect(validated.views?.[0]).toMatchObject({ grouping: [], leaf: "title" });
    expect(authored.views[0]).not.toHaveProperty("grouping");
    const entry = validated.tracks[0]!;
    if (entry.type !== "transformed") throw new Error("Unexpected module");
    const track = transformedModule.create({ base: entry.base, config: entry.config });
    expect(track.config).toEqual({ value: 5, offset: 2, enabled: true });
    expect(entry.config).toEqual({ value: "hello", offset: 1 });
    expect(() =>
      validateTrackCollection(
        { ...authored, tracks: [{ ...entry, config: { value: "x", offset: 1 } }] },
        modules,
      ),
    ).toThrow(/config.value/);
    expect(generateTrackCollectionJsonSchema(modules)).toMatchObject({
      properties: {
        tracks: {
          items: {
            oneOf: [
              expect.anything(),
              {
                properties: {
                  config: { properties: { value: { type: "string" }, offset: { type: "number" } } },
                },
              },
            ],
          },
        },
      },
    });

    // These invalid authored values must fail TypeScript even without runtime validation.
    const mismatched: Entry = {
      type: "transformed",
      base: { id: "one", title: "One" },
      // @ts-expect-error A signal config cannot be paired with the transformed module.
      config: { url: "YOUR_URL_HERE" },
    };
    // @ts-expect-error Config values must use the transform's input type.
    const resolved: TransformedEntry["config"] = { value: 5, offset: 1 };
    // @ts-expect-error Unknown modules cannot be authored with this module tuple.
    const unknownType: Entry["type"] = "missing";
    void [mismatched, resolved, unknownType];
  });

  it("rejects unknown track types and invalid nested config", () => {
    expect(() =>
      validateTrackCollection(
        {
          ...validCollection,
          tracks: [{ ...validCollection.tracks[0], type: "missing" }],
        },
        registry.modules,
      ),
    ).toThrow(/Track collection is invalid/);

    expect(() =>
      validateTrackCollection(
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
      validateTrackCollection(
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

    expect(validateTrackCollection(collection, defaultedRegistry.modules).tracks[0]).toEqual({
      base: {
        id: "signal-1",
        title: "Signal 1",
      },
      type: "defaulted-signal",
      config: { assembly: "hg38" },
      metadata: { assay: "signal" },
    });
    expect(() =>
      validateTrackCollection(
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

  it("rejects duplicate module types before building or using a collection schema", () => {
    const modules = [signalModule, { ...signalModule }];
    const error = "Duplicate track module type: signal";

    expect(() => generateTrackCollectionJsonSchema(modules)).toThrow(error);
    expect(() => validateTrackCollection(validCollection, modules)).toThrow(error);
  });

  it("rejects empty registries", () => {
    expect(() => validateTrackCollection(validCollection, [])).toThrow(
      /At least one track module is required/,
    );
  });
});
