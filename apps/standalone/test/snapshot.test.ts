import { describe, expect, it } from "vitest";
import { ccreBigBedModule } from "@weng-lab/genomebrowser-tracks/ccre";
import { assemblies, defaultAssembly } from "../features/browser/assembly";
import { createBrowserStores } from "../features/browser/stores";
import { getTrackCollections } from "../features/browser/trackCollections";
import { createInitialSnapshot } from "../features/sessions/initialSnapshot";
import { captureSessionSnapshot } from "../features/sessions/snapshot";
import { parseSessionSnapshot } from "../features/sessions/validation";

describe("session snapshots", () => {
  it.each(assemblies)(
    "initializes and restores $label with assembly-specific references",
    (assembly) => {
      const initial = parseSessionSnapshot(createInitialSnapshot(assembly));
      const { useBrowserStore, useTrackStore } = createBrowserStores(initial);
      const restored = parseSessionSnapshot(captureSessionSnapshot(useBrowserStore, useTrackStore));
      expect(restored.browser.assembly.id).toBe(assembly.definition.id);
      expect(restored.trackStore.tracks[1].config.url).toBe(
        assembly.reference.genes.find(({ id }) => id === assembly.reference.defaultGeneDatasetId)
          ?.url,
      );
      expect(
        getTrackCollections(assembly).every(
          (collection) => collection.assembly === assembly.definition.id,
        ),
      ).toBe(true);
    },
  );

  it("round trips highlights and track settings but resets selection mode and excludes runtime values", () => {
    const { useBrowserStore, useTrackStore } = createBrowserStores();
    useBrowserStore.getState().setSelectionMode("highlight");
    useBrowserStore.getState().addHighlight({
      id: "highlight",
      region: { chromosome: "chr12", start: 53373000, end: 53374000 },
      color: "#ABCDEF",
      opacity: 0.4,
      type: "outlined",
    });
    const geneId = useTrackStore.getState().tracks[1].base.id;
    useTrackStore.getState().updateTrack(geneId, {
      base: { color: "#ABCDEF", height: 120 },
      interaction: { onClick: () => undefined },
    });
    const snapshot = parseSessionSnapshot(captureSessionSnapshot(useBrowserStore, useTrackStore));
    expect(snapshot.browser).not.toHaveProperty("selectionMode");
    expect(snapshot.browser).not.toHaveProperty("setRegion");
    expect(snapshot.trackStore).not.toHaveProperty("registry");
    expect(snapshot.trackStore.tracks[1]).not.toHaveProperty("interaction");
    const restored = createBrowserStores(JSON.parse(JSON.stringify(snapshot)));
    expect(restored.useBrowserStore.getState().selectionMode).toBe("pan");
    expect(restored.useBrowserStore.getState().highlights).toEqual(
      useBrowserStore.getState().highlights,
    );
    expect(restored.useTrackStore.getState().tracks[1].base.height).toBe(120);
    useBrowserStore.getState().removeHighlight("highlight");
    expect(snapshot.browser.highlights).toHaveLength(1);
    expect(restored.useBrowserStore.getState().highlights).toHaveLength(1);
  });

  it("preserves track order, pinned IDs, source ownership, and application callbacks", () => {
    const { useBrowserStore, useTrackStore } = createBrowserStores();
    const module = ccreBigBedModule;
    useTrackStore.getState().addTrack(
      module.create({
        base: { id: "human-biosamples::ccre-aggregate", title: "cCRE" },
        source: "host",
        config: { url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed" },
      }),
    );
    const ids = useTrackStore.getState().order;
    useTrackStore.getState().reorderTracks([ids[0], ids[2], ids[1]]);
    const restored = createBrowserStores(
      parseSessionSnapshot(captureSessionSnapshot(useBrowserStore, useTrackStore)),
    );
    expect(restored.useTrackStore.getState().order).toEqual(useTrackStore.getState().order);
    expect(restored.useTrackStore.getState().pinnedTrackIds).toEqual(["reference-ruler"]);
    expect(restored.useTrackStore.getState().tracks[1].source).toBe("host");
    expect(restored.useTrackStore.getState().tracks[1].interaction?.onClick).toBeTypeOf("function");
  });

  it("rejects unknown versions, unregistered assemblies, duplicate tracks and invalid module configuration", () => {
    const valid = createInitialSnapshot(defaultAssembly);
    expect(() => parseSessionSnapshot({ ...valid, version: 2 })).toThrow();
    expect(() =>
      parseSessionSnapshot({
        ...valid,
        browser: { ...valid.browser, assembly: { ...valid.browser.assembly, id: "unknown" } },
      }),
    ).toThrow();
    expect(() =>
      parseSessionSnapshot({
        ...valid,
        trackStore: {
          ...valid.trackStore,
          tracks: [valid.trackStore.tracks[0], valid.trackStore.tracks[0]],
        },
      }),
    ).toThrow();
    valid.trackStore.tracks[1].config.url = 42;
    expect(() => parseSessionSnapshot(valid)).toThrow(/configuration/);
  });

  it("rejects values JSON serialization would silently lose", () => {
    const { useBrowserStore, useTrackStore } = createBrowserStores();
    // A custom module may retain a non-JSON value. The serializer must fail rather than lose it.
    useTrackStore.getState().tracks[0].config.unserializable = () => undefined;
    expect(() => captureSessionSnapshot(useBrowserStore, useTrackStore)).toThrow(/JSON/);
  });
});
