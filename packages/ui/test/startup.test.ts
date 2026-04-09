import { Track, TrackType, createTrackStore } from "@weng-lab/genomebrowser";
import { describe, expect, it } from "vitest";
import { FolderDefinition } from "../src/TrackSelect/Folders/types";
import {
  cloneSelectionMap,
  deriveManagedDraftSelectionFromStore,
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

describe("TrackSelect managed draft helpers", () => {
  it("derives managed draft selection from the committed track store", () => {
    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
      makeTrack("managed-b", "Managed B"),
      makeTrack("managed-a", "Managed A"),
    ]);

    expect(
      deriveManagedDraftSelectionFromStore({
        folders: [createTestFolder()],
        trackStore,
      }),
    ).toEqual({
      selectedByFolder: new Map([
        ["test-folder", new Set(["managed-b", "managed-a"])],
      ]),
    });
  });

  it("derives an empty managed draft when the committed track store has no managed tracks", () => {
    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
    ]);

    expect(
      deriveManagedDraftSelectionFromStore({
        folders: [createTestFolder()],
        trackStore,
      }),
    ).toEqual({
      selectedByFolder: new Map([["test-folder", new Set<string>()]]),
    });
  });

  it("keeps unsaved draft edits local until the user submits", () => {
    const folder = createTestFolder();
    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
      makeTrack("managed-b", "Managed B"),
      makeTrack("managed-a", "Managed A"),
    ]);
    const committedDraft = deriveManagedDraftSelectionFromStore({
      folders: [folder],
      trackStore,
    });
    const unsavedDraft = {
      selectedByFolder: cloneSelectionMap(committedDraft.selectedByFolder),
    };

    unsavedDraft.selectedByFolder.set("test-folder", new Set(["managed-a"]));

    expect(trackStore.getState().tracks.map((track) => track.id)).toEqual([
      "external-track",
      "managed-b",
      "managed-a",
    ]);
    expect(
      deriveManagedDraftSelectionFromStore({
        folders: [folder],
        trackStore,
      }),
    ).toEqual(committedDraft);
  });

  it("replaces only the managed subset on submit while preserving unmanaged tracks", () => {
    const folder = createTestFolder();
    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
      makeTrack("managed-a", "Managed A"),
    ]);

    expect(trackStore.getState().tracks.map((track) => track.id)).toEqual([
      "external-track",
      "managed-a",
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

  it("replaces the managed subset across folders without depending on selection order", () => {
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
      trackStore,
    });

    const trackIds = trackStore.getState().tracks.map((track) => track.id);

    expect(trackIds[0]).toBe("external-track");
    expect(trackIds.slice(1).sort()).toEqual(["managed-a", "managed-b"]);
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
});
