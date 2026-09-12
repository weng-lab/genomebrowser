import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createTrackStore, defineTrackModule } from "@weng-lab/genomebrowser";
import { validateJson, generateTrackCollectionJsonSchema, type TrackCollection } from "../src/lib";
import { compileTrackCollections } from "../src/TrackSelect/collection/collectionCompilation";
import { getReconciledTracks } from "../src/TrackSelect/collection/collectionStore";

const signalModule = defineTrackModule({
  type: "signal",
  defaults: { height: 60, color: "#2266aa" },
  configSchema: z.object({ url: z.string().min(1), scale: z.number().default(1) }),
  fetch: async () => null,
  render: { full: () => null },
});
const registry = createTrackStore({ modules: [signalModule] }).getState().registry;
const minimal: TrackCollection = {
  assembly: "lab/custom-v1",
  id: "signals",
  tracks: [
    { type: "signal", base: { id: "one", title: "Signal one" }, config: { url: "YOUR_URL_HERE" } },
  ],
};

describe("portable track collections", () => {
  it("validates a minimal collection and creates tracks without TrackSelect", () => {
    const collection = validateJson(JSON.parse(JSON.stringify(minimal)), registry.modules);
    expect(collection).toEqual(minimal);
    expect(collection.tracks[0]).not.toHaveProperty("metadata");
    const track = registry
      .get(collection.tracks[0]!.type)
      .create({ base: collection.tracks[0]!.base, config: collection.tracks[0]!.config });
    expect(track.base).toEqual({
      id: "one",
      title: "Signal one",
      display: "full",
      height: 60,
      color: "#2266aa",
    });
    expect(track.config).toEqual({ url: "YOUR_URL_HERE", scale: 1 });
    expect(collection.tracks[0]!.base).not.toHaveProperty("height");
  });

  it("preserves a configured track through a JSON collection round trip", () => {
    const original = signalModule.create({
      base: { id: "one", title: "Custom", height: 125, color: "#abcdef" },
      config: { url: "YOUR_URL_HERE", scale: 4 },
    });
    const { type, base, config } = original;
    const collection = validateJson(
      JSON.parse(JSON.stringify({ ...minimal, tracks: [{ type, base, config }] })),
      registry.modules,
    );
    expect(
      registry
        .get(collection.tracks[0]!.type)
        .create({ base: collection.tracks[0]!.base, config: collection.tracks[0]!.config }),
    ).toEqual(original);
  });

  it("provides picker defaults without adding them to authored data", () => {
    const compiledCollections = compileTrackCollections([validateJson(minimal, registry.modules)]);
    const record = compiledCollections.records[0]!;
    expect(record.label).toBe("signals");
    expect(record.assembly).toBe("lab/custom-v1");
    expect(record.views).toEqual([
      {
        id: "default",
        label: "Tracks",
        columns: [{ field: "title", label: "Track" }],
        grouping: [],
        leaf: "title",
      },
    ]);
    expect(record.rows[0]).toMatchObject({ id: "signals::one", title: "Signal one" });
    const [track] = getReconciledTracks({
      compiledCollections,
      tracks: [],
      selectedTrackIds: ["signals::one"],
      registry,
      maxTracks: 10,
    });
    expect(track?.base.id).toBe("signals::one");
    expect(track?.base.color).toBe("#2266aa");
    expect(minimal.tracks[0]!.base.id).toBe("one");
    expect(minimal).not.toHaveProperty("views");
  });

  it.each([undefined, "", 38, { id: "hg38" }])("rejects invalid assembly %j", (assembly) => {
    expect(() => validateJson({ ...minimal, assembly }, registry.modules)).toThrow(/assembly/);
  });

  it("rejects the flat track format and duplicate track IDs", () => {
    expect(() =>
      validateJson(
        {
          ...minimal,
          tracks: [
            { type: "signal", id: "one", title: "Signal", config: { url: "YOUR_URL_HERE" } },
          ],
        },
        registry.modules,
      ),
    ).toThrow(/base/);
    expect(() =>
      validateJson(
        { ...minimal, tracks: [minimal.tracks[0], minimal.tracks[0]] },
        registry.modules,
      ),
    ).toThrow(/duplicates/);
  });

  it("requires metadata only when an authored view uses it", () => {
    expect(() =>
      validateJson(
        { ...minimal, views: [{ id: "assay", label: "Assay", columns: [{ field: "assay" }] }] },
        registry.modules,
      ),
    ).toThrow(/metadata is missing "assay"/);
    expect(() => validateJson({ ...minimal, views: [] }, registry.modules)).toThrow(/views/);
  });

  it("exposes only assembly, id and tracks as required collection fields in JSON Schema", () => {
    expect(generateTrackCollectionJsonSchema(registry.modules)).toMatchObject({
      required: ["assembly", "id", "tracks"],
      properties: {
        tracks: {
          items: {
            oneOf: [
              {
                required: ["base", "config", "type"],
                properties: { base: { required: ["id", "title"] } },
              },
            ],
          },
        },
      },
    });
  });
});
