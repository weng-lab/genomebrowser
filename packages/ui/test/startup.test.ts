import { Track, TrackType, createTrackStore } from "@weng-lab/genomebrowser";
import { describe, expect, it } from "vitest";
import { FolderDefinition } from "../src/TrackSelect/Folders/types";
import {
  buildSelectionOrderFromSelectionMap,
  deriveManagedSelectionFromStore,
  deriveManagedSelectionOrderFromStore,
  reconcileManagedSelectionWithStore,
  replaceManagedTracksInStore,
} from "../src/TrackSelect/managedTracks";

interface TestRow {
  id: string;
  label: string;
}

const makeTrack = (id: string, title: string): Track => {
  return {
    id,
    title,
    height: 40,
    trackType: TrackType.Custom,
  } as Track;
};

const createTestFolder = (): FolderDefinition<TestRow> => {
  const rows = [
    { id: "managed-a", label: "Managed A" },
    { id: "managed-b", label: "Managed B" },
  ];

  return {
    id: "test-folder",
    label: "Test Folder",
    rowById: new Map(rows.map((row) => [row.id, row])),
    getRowId: (row) => row.id,
    columns: [],
    groupingModel: [],
    leafField: "label",
    buildTree: () => [],
    createTrack: (row) => makeTrack(row.id, row.label),
  };
};

describe("TrackSelect startup", () => {
  it("derives managed draft selection from the committed track store", () => {
    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
      makeTrack("managed-b", "Managed B"),
      makeTrack("managed-a", "Managed A"),
    ]);

    expect(
      deriveManagedSelectionFromStore({
        folders: [createTestFolder()],
        trackStore,
      }),
    ).toEqual(new Map([["test-folder", new Set(["managed-b", "managed-a"])]]));
  });

  it("derives managed draft selection order from the committed track store", () => {
    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
      makeTrack("managed-b", "Managed B"),
      makeTrack("managed-a", "Managed A"),
    ]);

    expect(
      deriveManagedSelectionOrderFromStore({
        folders: [createTestFolder()],
        trackStore,
      }),
    ).toEqual(["managed-b", "managed-a"]);
  });

  it("derives an empty draft selection when the committed track store has no managed tracks", () => {
    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
    ]);

    expect(
      deriveManagedSelectionFromStore({
        folders: [createTestFolder()],
        trackStore,
      }),
    ).toEqual(new Map([["test-folder", new Set<string>()]]));
  });

  it("replaces only the managed subset when selection changes", () => {
    const folder = createTestFolder();

    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
      makeTrack("managed-a", "Managed A"),
    ]);

    replaceManagedTracksInStore({
      assembly: "GRCh38",
      folders: [folder],
      selectedByFolder: new Map([["test-folder", new Set(["managed-b"])]]),
      trackStore,
    });

    expect(trackStore.getState().tracks.map((track) => track.id)).toEqual([
      "external-track",
      "managed-b",
    ]);
  });

  it("rebuilds managed tracks in first-selection order across folders", () => {
    const alphaFolder: FolderDefinition<TestRow> = {
      ...createTestFolder(),
      id: "alpha-folder",
      label: "Alpha Folder",
      rowById: new Map([
        ["managed-a", { id: "managed-a", label: "Managed A" }],
      ]),
    };
    const betaFolder: FolderDefinition<TestRow> = {
      ...createTestFolder(),
      id: "beta-folder",
      label: "Beta Folder",
      rowById: new Map([
        ["managed-b", { id: "managed-b", label: "Managed B" }],
      ]),
    };
    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
      makeTrack("managed-a", "Managed A"),
    ]);

    replaceManagedTracksInStore({
      assembly: "GRCh38",
      folders: [alphaFolder, betaFolder],
      selectedByFolder: new Map([
        ["alpha-folder", new Set(["managed-a"])],
        ["beta-folder", new Set(["managed-b"])],
      ]),
      selectedTrackIdsInOrder: ["managed-b", "managed-a"],
      trackStore,
    });

    expect(trackStore.getState().tracks.map((track) => track.id)).toEqual([
      "external-track",
      "managed-b",
      "managed-a",
    ]);
  });

  it("removes deselected managed tracks while leaving ghost tracks alone", () => {
    const folder = createTestFolder();
    const trackStore = createTrackStore([
      makeTrack("ghost-track", "Ghost"),
      makeTrack("managed-a", "Managed A"),
    ]);

    replaceManagedTracksInStore({
      assembly: "GRCh38",
      folders: [folder],
      selectedByFolder: new Map([["test-folder", new Set<string>()]]),
      trackStore,
    });

    expect(trackStore.getState().tracks.map((track) => track.id)).toEqual([
      "ghost-track",
    ]);
  });

  it("does not infer managed selections from ghost or external tracks", () => {
    const folder = createTestFolder();
    const selectedByFolder = new Map([["test-folder", new Set<string>()]]);
    const trackStore = createTrackStore([
      makeTrack("ghost-track", "Ghost"),
      makeTrack("managed-b", "External Managed-Looking Track"),
    ]);

    expect(
      reconcileManagedSelectionWithStore({
        folders: [folder],
        selectedByFolder,
        trackStore,
      }),
    ).toBe(selectedByFolder);
  });

  it("drops stale managed selections after external track-store removals", () => {
    const folder = createTestFolder();
    const selectedByFolder = new Map([
      ["test-folder", new Set(["managed-a", "managed-b"])],
    ]);
    const trackStore = createTrackStore([
      makeTrack("ghost-track", "Ghost"),
      makeTrack("managed-b", "Managed B"),
    ]);

    expect(
      reconcileManagedSelectionWithStore({
        folders: [folder],
        selectedByFolder,
        trackStore,
      }),
    ).toEqual(new Map([["test-folder", new Set(["managed-b"])]]));
  });

  it("decorates managed tracks after folder creation and before store insertion", () => {
    const folder = createTestFolder();
    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
    ]);

    replaceManagedTracksInStore({
      assembly: "GRCh38",
      decorateTrack: ({ folder, row, track }) => ({
        ...track,
        title: `${folder.id}:${(row as TestRow).label}`,
        onClick: () => `${track.id}-clicked`,
      }),
      folders: [folder],
      selectedByFolder: new Map([["test-folder", new Set(["managed-a"])]]),
      trackStore,
    });

    expect(trackStore.getState().tracks.map((track) => track.id)).toEqual([
      "external-track",
      "managed-a",
    ]);

    const managedTrack = trackStore
      .getState()
      .tracks.find((track) => track.id === "managed-a");

    expect(managedTrack?.title).toBe("test-folder:Managed A");
    expect(typeof managedTrack?.onClick).toBe("function");
  });

  it("builds fallback selection order from folder and set order", () => {
    const folder = createTestFolder();

    expect(
      buildSelectionOrderFromSelectionMap(
        [folder],
        new Map([["test-folder", new Set(["managed-b", "managed-a"])]]),
      ),
    ).toEqual(["managed-b", "managed-a"]);
  });
});
