import { Track, TrackType, createTrackStore } from "@weng-lab/genomebrowser";
import { describe, expect, it } from "vitest";
import { FolderDefinition } from "../src/TrackSelect/Folders/types";
import {
  deriveManagedDraftSelectionFromTracks,
  diffManagedTracks,
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
    { id: "test-folder/managed-a", label: "Managed A" },
    { id: "test-folder/managed-b", label: "Managed B" },
    { id: "test-folder/managed-c", label: "Managed C" },
    { id: "test-folder/managed-d", label: "Managed D" },
  ];

  return {
    id: "test-folder",
    label: "Test Folder",
    rows,
    columns: [],
    groupingModel: [],
    leafField: "label",
    createTrack: (row) => makeTrack(row.id, row.label),
  };
};

const applyManagedTrackDiff = (
  trackStore: ReturnType<typeof createTrackStore>,
  diff: ReturnType<typeof diffManagedTracks>,
) => {
  const { insertTrack, removeTrack } = trackStore.getState();
  diff.idsToRemove.forEach((id) => removeTrack(id));
  diff.tracksToAdd.forEach((track) => insertTrack(track));
};

describe("TrackSelect managed draft helpers", () => {
  it("derives managed draft selection from the committed track store", () => {
    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
      makeTrack("test-folder/managed-b", "Managed B"),
      makeTrack("test-folder/managed-a", "Managed A"),
    ]);

    expect(
      deriveManagedDraftSelectionFromTracks({
        folders: [createTestFolder()],
        tracks: trackStore.getState().tracks,
      }),
    ).toEqual({
      selectedByFolder: new Map([
        [
          "test-folder",
          new Set(["test-folder/managed-b", "test-folder/managed-a"]),
        ],
      ]),
    });
  });

  it("derives an empty managed draft when the committed track store has no managed tracks", () => {
    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
    ]);

    expect(
      deriveManagedDraftSelectionFromTracks({
        folders: [createTestFolder()],
        tracks: trackStore.getState().tracks,
      }),
    ).toEqual({
      selectedByFolder: new Map([["test-folder", new Set<string>()]]),
    });
  });

  it("keeps unsaved draft edits local until the user submits", () => {
    const folder = createTestFolder();
    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
      makeTrack("test-folder/managed-b", "Managed B"),
      makeTrack("test-folder/managed-a", "Managed A"),
    ]);
    const committedDraft = deriveManagedDraftSelectionFromTracks({
      folders: [folder],
      tracks: trackStore.getState().tracks,
    });
    const unsavedDraft = {
      selectedByFolder: new Map(
        Array.from(committedDraft.selectedByFolder, ([folderId, ids]) => [
          folderId,
          new Set(ids),
        ]),
      ),
    };

    unsavedDraft.selectedByFolder.set(
      "test-folder",
      new Set(["test-folder/managed-a"]),
    );

    expect(trackStore.getState().tracks.map((track) => track.id)).toEqual([
      "external-track",
      "test-folder/managed-b",
      "test-folder/managed-a",
    ]);
    expect(
      deriveManagedDraftSelectionFromTracks({
        folders: [folder],
        tracks: trackStore.getState().tracks,
      }),
    ).toEqual(committedDraft);
  });

  it("preserves existing managed tracks on submit when selections do not change", () => {
    const folder = createTestFolder();
    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
      makeTrack("test-folder/managed-a", "Managed A"),
    ]);

    trackStore.getState().editTrack("test-folder/managed-a", { height: 120 });
    const editedManagedTrack = trackStore
      .getState()
      .getTrack("test-folder/managed-a");

    expect(trackStore.getState().tracks.map((track) => track.id)).toEqual([
      "external-track",
      "test-folder/managed-a",
    ]);

    applyManagedTrackDiff(
      trackStore,
      diffManagedTracks({
        assembly: "GRCh38",
        currentTracks: trackStore.getState().tracks,
        folders: [folder],
        selectedByFolder: new Map([
          ["test-folder", new Set(["test-folder/managed-a"])],
        ]),
      }),
    );

    expect(trackStore.getState().tracks.map((track) => track.id)).toEqual([
      "external-track",
      "test-folder/managed-a",
    ]);
    expect(trackStore.getState().getTrack("test-folder/managed-a")).toBe(
      editedManagedTrack,
    );
    expect(
      trackStore.getState().getTrack("test-folder/managed-a")?.height,
    ).toBe(120);
  });

  it("appends newly selected managed tracks to the bottom of the store", () => {
    const folder = createTestFolder();
    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
      makeTrack("test-folder/managed-a", "Managed A"),
    ]);

    applyManagedTrackDiff(
      trackStore,
      diffManagedTracks({
        assembly: "GRCh38",
        currentTracks: trackStore.getState().tracks,
        folders: [folder],
        selectedByFolder: new Map([
          [
            "test-folder",
            new Set(["test-folder/managed-a", "test-folder/managed-b"]),
          ],
        ]),
      }),
    );

    expect(trackStore.getState().tracks.map((track) => track.id)).toEqual([
      "external-track",
      "test-folder/managed-a",
      "test-folder/managed-b",
    ]);
  });

  it("removes only deselected managed tracks while preserving unmanaged tracks", () => {
    const folder = createTestFolder();
    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
      makeTrack("test-folder/managed-a", "Managed A"),
      makeTrack("test-folder/managed-b", "Managed B"),
    ]);

    applyManagedTrackDiff(
      trackStore,
      diffManagedTracks({
        assembly: "GRCh38",
        currentTracks: trackStore.getState().tracks,
        folders: [folder],
        selectedByFolder: new Map([
          ["test-folder", new Set(["test-folder/managed-b"])],
        ]),
      }),
    );

    expect(trackStore.getState().tracks.map((track) => track.id)).toEqual([
      "external-track",
      "test-folder/managed-b",
    ]);
  });

  it("applies multiple managed additions and removals in one submit flow", () => {
    const folder = createTestFolder();
    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
      makeTrack("test-folder/managed-a", "Managed A"),
      makeTrack("test-folder/managed-c", "Managed C"),
    ]);

    applyManagedTrackDiff(
      trackStore,
      diffManagedTracks({
        assembly: "GRCh38",
        currentTracks: trackStore.getState().tracks,
        folders: [folder],
        selectedByFolder: new Map([
          [
            "test-folder",
            new Set(["test-folder/managed-b", "test-folder/managed-d"]),
          ],
        ]),
      }),
    );

    expect(trackStore.getState().tracks.map((track) => track.id)).toEqual([
      "external-track",
      "test-folder/managed-b",
      "test-folder/managed-d",
    ]);
  });

  it("decorates managed tracks after folder creation and before store insertion", () => {
    const folder = createTestFolder();
    const trackStore = createTrackStore([
      makeTrack("external-track", "External"),
    ]);

    applyManagedTrackDiff(
      trackStore,
      diffManagedTracks({
        assembly: "GRCh38",
        currentTracks: trackStore.getState().tracks,
        decorateTrack: ({ folder, row, track }) => ({
          ...track,
          title: `${folder.id}:${(row as TestRow).label}`,
          onClick: () => `${track.id}-clicked`,
        }),
        folders: [folder],
        selectedByFolder: new Map([
          ["test-folder", new Set(["test-folder/managed-a"])],
        ]),
      }),
    );

    expect(trackStore.getState().tracks.map((track) => track.id)).toEqual([
      "external-track",
      "test-folder/managed-a",
    ]);

    const managedTrack = trackStore
      .getState()
      .tracks.find((track) => track.id === "test-folder/managed-a");

    expect(managedTrack?.title).toBe("test-folder:Managed A");
    expect(typeof managedTrack?.onClick).toBe("function");
  });
});
