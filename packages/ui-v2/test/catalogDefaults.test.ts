import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createModuleRegistry, defineTrackModule } from "../../v2/src/lib";
import {
  clearOrderedSelection,
  createOrderedSelectionFromTracks,
  createSelectionByCatalog,
  removeOrderedTrackIds,
  setOrderedCatalogSelection,
} from "../src/TrackSelect/catalog/catalogSelection";
import { getReconciledTracks } from "../src/TrackSelect/catalog/catalogStore";
import type { TrackSelectCatalog, TrackSelectView } from "../src/TrackSelect/schema/catalogSchema";

function Renderer() {
  return null;
}

const signalModule = defineTrackModule({
  type: "signal",
  configSchema: z.object({ url: z.string().min(1) }),
  fetch: async () => null,
  render: { full: Renderer },
});
const registry = createModuleRegistry([signalModule]);

const defaultView: TrackSelectView = {
  id: "default",
  label: "Default",
  columns: [{ field: "title" }],
  grouping: [],
  leaf: "title",
};

const catalogs: TrackSelectCatalog[] = [
  {
    id: "alpha",
    label: "Alpha",
    views: [defaultView],
    tracks: [
      {
        type: "signal",
        id: "one",
        title: "Alpha one",
        config: { url: "alpha-one" },
        metadata: {},
      },
      {
        type: "signal",
        id: "two",
        title: "Alpha two",
        config: { url: "alpha-two" },
        metadata: {},
      },
    ],
  },
  {
    id: "beta",
    label: "Beta",
    views: [defaultView],
    tracks: [
      {
        type: "signal",
        id: "one",
        title: "Beta one",
        config: { url: "beta-one" },
        metadata: {},
      },
    ],
  },
];

describe("TrackSelect default track reconciliation", () => {
  it("preserves non-catalog tracks and applies the exact cross-catalog order", () => {
    const unmanagedTrack = signalModule.create({
      id: "unmanaged",
      title: "Unmanaged",
      config: { url: "unmanaged" },
    });
    const existingDefault = signalModule.create({
      id: "alpha::one",
      title: "Existing alpha one",
      config: { url: "existing" },
    });
    const unselectedCatalogTrack = signalModule.create({
      id: "alpha::two",
      title: "Unselected alpha two",
      config: { url: "unselected" },
    });

    const nextTracks = getReconciledTracks({
      trackCatalogs: catalogs,
      tracks: [existingDefault, unmanagedTrack, unselectedCatalogTrack],
      selectedTrackIds: ["beta::one", "alpha::one"],
      registry,
      maxTracks: 10,
    });

    expect(nextTracks.map((track) => track.base.id)).toEqual([
      "unmanaged",
      "beta::one",
      "alpha::one",
    ]);
    expect(nextTracks[2]).toBe(existingDefault);
    expect(nextTracks).not.toContain(unselectedCatalogTrack);
  });

  it("treats an empty default list as an authoritative catalog clear", () => {
    const unmanagedTrack = signalModule.create({
      id: "unmanaged",
      title: "Unmanaged",
      config: { url: "unmanaged" },
    });
    const catalogTrack = signalModule.create({
      id: "alpha::one",
      title: "Alpha one",
      config: { url: "alpha-one" },
    });

    const nextTracks = getReconciledTracks({
      trackCatalogs: catalogs,
      tracks: [catalogTrack, unmanagedTrack],
      selectedTrackIds: [],
      registry,
      maxTracks: 10,
    });

    expect(nextTracks).toEqual([unmanagedTrack]);
  });

  it("rejects duplicate, unknown, and over-limit defaults", () => {
    const options = {
      trackCatalogs: catalogs,
      tracks: [],
      registry,
      maxTracks: 2,
    };

    expect(() =>
      getReconciledTracks({
        ...options,
        selectedTrackIds: ["alpha::one", "alpha::one"],
      }),
    ).toThrow("Duplicate default track id: alpha::one");
    expect(() => getReconciledTracks({ ...options, selectedTrackIds: ["alpha::missing"] })).toThrow(
      "Unknown default track id: alpha::missing",
    );
    expect(() =>
      getReconciledTracks({
        ...options,
        selectedTrackIds: ["alpha::one", "alpha::two", "beta::one"],
      }),
    ).toThrow("Default track count 3 exceeds the maximum of 2");
  });
});

describe("TrackSelect ordered draft selection", () => {
  it("derives catalog selections without losing store order", () => {
    const orderedIds = createOrderedSelectionFromTracks(catalogs, [
      { base: { id: "beta::one" } },
      { base: { id: "unmanaged" } },
      { base: { id: "alpha::one" } },
    ]);
    const selectedByCatalog = createSelectionByCatalog(catalogs, orderedIds);

    expect(orderedIds).toEqual(["beta::one", "alpha::one"]);
    expect(Array.from(selectedByCatalog.get("alpha") ?? [])).toEqual(["alpha::one"]);
    expect(Array.from(selectedByCatalog.get("beta") ?? [])).toEqual(["beta::one"]);
  });

  it("preserves surviving tracks and appends additions in active-view order", () => {
    const next = setOrderedCatalogSelection({
      selectedTrackIds: ["beta::one", "alpha::one"],
      catalog: catalogs[0],
      view: defaultView,
      selectedIds: new Set(["alpha::two", "alpha::one"]),
    });

    expect(next).toEqual(["beta::one", "alpha::one", "alpha::two"]);
  });

  it("clears and removes tracks without disturbing remaining order", () => {
    const selectedIds = ["alpha::one", "beta::one", "alpha::two"];

    expect(clearOrderedSelection(selectedIds, catalogs[0])).toEqual(["beta::one"]);
    expect(clearOrderedSelection(selectedIds)).toEqual([]);
    expect(removeOrderedTrackIds(selectedIds, ["beta::one"])).toEqual(["alpha::one", "alpha::two"]);
  });
});
