import { describe, expect, it } from "vitest";
import { ccreBigBedModule } from "@weng-lab/genomebrowser-tracks/ccre";
import { assemblies, defaultAssembly } from "@/features/assemblies/assemblies";
import { restoreStores } from "@/features/session-snapshot/restoreStores";
import { getTrackCollections } from "@/features/assemblies/trackCollections";
import { createInitialSnapshot } from "@/features/session-snapshot/initialSnapshot";
import { captureSessionSnapshot } from "@/features/session-snapshot/captureSnapshot";
import { parseSessionSnapshot } from "@/features/session-snapshot/parseSnapshot";

describe("session snapshots", () => {
  it.each(assemblies)(
    "initializes and restores $label with assembly-specific references",
    (assembly) => {
      const initial = parseSessionSnapshot(createInitialSnapshot(assembly));
      const { useBrowserStore, useTrackStore } = restoreStores(initial);
      const restored = parseSessionSnapshot(captureSessionSnapshot(useBrowserStore, useTrackStore));
      expect(restored.trackStore.pinnedTrackIds).toEqual(
        restored.trackStore.tracks.map(({ base }) => base.id),
      );
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
    const { useBrowserStore, useTrackStore } = restoreStores();
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
    const restored = restoreStores(JSON.parse(JSON.stringify(snapshot)));
    expect(restored.useBrowserStore.getState().selectionMode).toBe("pan");
    expect(restored.useBrowserStore.getState().highlights).toEqual(
      useBrowserStore.getState().highlights,
    );
    expect(restored.useTrackStore.getState().tracks[1].base.height).toBe(120);
    useBrowserStore.getState().removeHighlight("highlight");
    expect(snapshot.browser.highlights).toHaveLength(1);
    expect(restored.useBrowserStore.getState().highlights).toHaveLength(1);
  });

  it("preserves track order, pinned IDs, and source ownership", () => {
    const { useBrowserStore, useTrackStore } = restoreStores();
    const module = ccreBigBedModule;
    useTrackStore.getState().addTrack(
      module.create({
        base: { id: "human-biosamples::ccre-aggregate", title: "cCRE" },
        source: "host",
        config: { url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed" },
      }),
    );
    useTrackStore.getState().setPinnedTrackIds(["reference-ruler"]);
    const ids = useTrackStore.getState().order;
    useTrackStore.getState().reorderTracks([ids[0], ids[2], ids[1]]);
    const restored = restoreStores(
      parseSessionSnapshot(captureSessionSnapshot(useBrowserStore, useTrackStore)),
    );
    expect(restored.useTrackStore.getState().order).toEqual(useTrackStore.getState().order);
    expect(restored.useTrackStore.getState().pinnedTrackIds).toEqual(["reference-ruler"]);
    expect(restored.useTrackStore.getState().tracks[1].source).toBe("host");
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
    const { useBrowserStore, useTrackStore } = restoreStores();
    // A custom module may retain a non-JSON value. The serializer must fail rather than lose it.
    useTrackStore.getState().tracks[0].config.unserializable = () => undefined;
    expect(() => captureSessionSnapshot(useBrowserStore, useTrackStore)).toThrow(/JSON/);
  });
});
