import type { TrackInstance, TrackStore } from "@weng-lab/genomebrowser-v2";
import { useState } from "react";
import { getSelectionDiff } from "../catalog/catalogDiff";
import {
  clearSelection,
  countSelectedTracks,
  createSelectionFromTracks,
  removeTrackIdsFromSelection,
  setFolderSelection,
  type SelectedByFolder,
} from "../catalog/catalogSelection";
import { getActiveView, getInitialViewIds } from "../catalog/catalogViews";
import type { TrackSelectFolder } from "../schema/folderSchema";

type TrackSelectScreen = "folder-list" | "folder-detail";

type TrackSelectStateOptions = {
  folders: TrackSelectFolder[];
  tracks: TrackStore["tracks"];
  registry: TrackStore["registry"];
  addTrack: TrackStore["addTrack"];
  removeTrack: TrackStore["removeTrack"];
  maxTracks: number;
  onClose: () => void;
};

export type TrackSelectState = ReturnType<typeof useTrackSelectState>;

export function useTrackSelectState({
  folders,
  tracks,
  registry,
  addTrack,
  removeTrack,
  maxTracks,
  onClose,
}: TrackSelectStateOptions) {
  const [screen, setScreen] = useState<TrackSelectScreen>(() =>
    folders.length === 1 ? "folder-detail" : "folder-list",
  );
  const [activeFolderId, setActiveFolderId] = useState(
    () => folders[0]?.id ?? "",
  );
  const [activeViewIdByFolder, setActiveViewIdByFolder] = useState(() =>
    getInitialViewIds(folders),
  );
  const [selectedByFolder, setSelectedByFolder] = useState(() =>
    createSelectionFromTracks(folders, tracks),
  );
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const currentScreen = getCurrentScreen(screen, folders.length);
  const activeFolder =
    folders.find((folder) => folder.id === activeFolderId) ?? folders[0];
  const activeView = activeFolder
    ? getActiveView(activeFolder, activeViewIdByFolder)
    : undefined;
  const selectedTrackCount = countSelectedTracks(selectedByFolder);

  function selectFolder(folderId: string) {
    setActiveFolderId(folderId);
    setScreen("folder-detail");
  }

  function selectView(viewId: string) {
    if (!activeFolder) return;

    setActiveViewIdByFolder((current) => {
      const next = new Map(current);
      next.set(activeFolder.id, viewId);
      return next;
    });
  }

  function setDraftSelection(nextSelectedByFolder: SelectedByFolder) {
    const currentCount = countSelectedTracks(selectedByFolder);
    const nextCount = countSelectedTracks(nextSelectedByFolder);
    if (nextCount > maxTracks && nextCount > currentCount) {
      setLimitDialogOpen(true);
      return;
    }

    setSubmitError(undefined);
    setSelectedByFolder(nextSelectedByFolder);
  }

  function selectActiveFolderTracks(selectedIds: Set<string>) {
    if (!activeFolder) return;
    setDraftSelection(
      setFolderSelection(selectedByFolder, activeFolder.id, selectedIds),
    );
  }

  function clearDraftSelection() {
    setDraftSelection(
      clearSelection(
        folders,
        selectedByFolder,
        currentScreen === "folder-detail" ? activeFolder?.id : undefined,
      ),
    );
  }

  function resetDraftSelection() {
    setSubmitError(undefined);
    setSelectedByFolder(createSelectionFromTracks(folders, tracks));
  }

  function removeSelectedTrackIds(trackIds: string[]) {
    setDraftSelection(removeTrackIdsFromSelection(selectedByFolder, trackIds));
  }

  function submitSelection() {
    setSubmitError(undefined);

    const { idsToRemove, tracksToAdd } = getSelectionDiff({
      folders,
      tracks,
      selectedByFolder,
      activeViewIdByFolder,
    });

    let createdTracks: TrackInstance<any, any>[];
    try {
      createdTracks = tracksToAdd.map(({ id, track }) =>
        registry.get(track.type).create({ ...track.config, id }),
      );
    } catch (error) {
      setSubmitError(getErrorMessage(error));
      return;
    }

    for (const id of idsToRemove) {
      const result = removeTrack(id);
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
    }

    for (const track of createdTracks) {
      const result = addTrack(track);
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
    }

    onClose();
  }

  return {
    state: {
      folders,
      screen: currentScreen,
      activeFolder,
      activeView,
      activeViewIdByFolder,
      selectedByFolder,
      selectedTrackCount,
      limitDialogOpen,
      submitError,
    },
    actions: {
      selectFolder,
      backToFolders: () => setScreen("folder-list"),
      selectView,
      selectActiveFolderTracks,
      removeSelectedTrackIds,
      clearDraftSelection,
      resetDraftSelection,
      submitSelection,
      cancel: onClose,
      closeLimitDialog: () => setLimitDialogOpen(false),
    },
    meta: {
      maxTracks,
    },
  };
}

function getCurrentScreen(screen: TrackSelectScreen, folderCount: number) {
  if (folderCount === 0) return "folder-list";
  if (folderCount === 1) return "folder-detail";
  return screen;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Track Select error";
}
