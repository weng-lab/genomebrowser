import { Track, TrackType, createTrackStore } from "@weng-lab/genomebrowser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FolderDefinition } from "../src/TrackSelect/Folders/types";
import {
  reconcileManagedSelectionWithStore,
  replaceManagedTracksInStore,
} from "../src/TrackSelect/managedTracks";
import { createSelectionStore } from "../src/TrackSelect/store";

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

const createSessionStorageMock = () => {
  const storage = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
    clear: vi.fn(() => {
      storage.clear();
    }),
  };
};

describe("TrackSelect startup", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", createSessionStorageMock());
  });

  it("uses default managed ids when there is no stored selection", () => {
    const defaultManagedIds = new Map([
      ["test-folder", new Set(["managed-a"])],
    ]);
    const selectionStore = createSelectionStore(
      ["test-folder"],
      "test-key",
      defaultManagedIds,
    );
    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
    ]);

    replaceManagedTracksInStore({
      assembly: "GRCh38",
      folders: [createTestFolder()],
      selectedByFolder: selectionStore.getState().selectedByFolder,
      trackStore,
    });

    expect(trackStore.getState().tracks.map((track) => track.id)).toEqual([
      "external-track",
      "managed-a",
    ]);
  });

  it("uses stored managed ids before defaults when seeding the browser", () => {
    sessionStorage.setItem(
      "test-key",
      JSON.stringify({ "test-folder": ["managed-b"] }),
    );

    const selectionStore = createSelectionStore(
      ["test-folder"],
      "test-key",
      new Map([["test-folder", new Set(["managed-a"])]]),
    );
    const trackStore = createTrackStore([
      makeTrack("managed-a", "Stale Managed"),
    ]);

    replaceManagedTracksInStore({
      assembly: "GRCh38",
      folders: [createTestFolder()],
      selectedByFolder: selectionStore.getState().selectedByFolder,
      trackStore,
    });

    expect(trackStore.getState().tracks.map((track) => track.id)).toEqual([
      "managed-b",
    ]);
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
});
