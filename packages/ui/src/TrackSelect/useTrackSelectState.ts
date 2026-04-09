import { TreeViewBaseItem } from "@mui/x-tree-view";
import { Track, TrackStoreInstance } from "@weng-lab/genomebrowser";
import { useEffect, useMemo, useState } from "react";
import { Assembly, FolderDefinition } from "./Folders/types";
import {
  cloneSelectionMap,
  createEmptyManagedDraftSelection,
  deriveManagedDraftSelectionFromTracks,
  diffManagedTracks,
  ManagedTrackDecorator,
} from "./managedTracks";
import { ExtendedTreeItemProps } from "./types";

export type ViewState = "folder-list" | "folder-detail";

const deriveDraftSelection = ({
  folders,
  tracks,
}: {
  folders: FolderDefinition[];
  tracks?: Track[];
}) => {
  if (!tracks) {
    return createEmptyManagedDraftSelection(folders);
  }

  return deriveManagedDraftSelectionFromTracks({ folders, tracks });
};

export const updateFolderDraftSelection = ({
  activeFolder,
  ids,
  maxTracksLimit,
  selectedByFolder,
}: {
  activeFolder: FolderDefinition;
  ids: Set<string>;
  maxTracksLimit: number;
  selectedByFolder: Map<string, Set<string>>;
}) => {
  const filteredIds = new Set(
    Array.from(ids).filter((id) => activeFolder.rowById.has(id)),
  );

  let nextTotal = filteredIds.size;
  selectedByFolder.forEach((folderIds, folderId) => {
    if (folderId !== activeFolder.id) {
      nextTotal += folderIds.size;
    }
  });

  if (nextTotal > maxTracksLimit) {
    return {
      overLimit: true,
      selectedByFolder,
    };
  }

  const nextSelectedByFolder = cloneSelectionMap(selectedByFolder);
  nextSelectedByFolder.set(activeFolder.id, filteredIds);

  return {
    overLimit: false,
    selectedByFolder: nextSelectedByFolder,
  };
};

export const removeTreeItemFromDraftSelection = ({
  item,
  selectedByFolder,
}: {
  item: TreeViewBaseItem<ExtendedTreeItemProps>;
  selectedByFolder: Map<string, Set<string>>;
}) => {
  const folderId = item.folderId;
  if (!folderId || !item.allExpAccessions?.length) {
    return selectedByFolder;
  }

  const current = selectedByFolder.get(folderId) ?? new Set<string>();
  const nextSet = new Set(current);
  item.allExpAccessions.forEach((id) => nextSet.delete(id));

  const nextSelectedByFolder = cloneSelectionMap(selectedByFolder);
  nextSelectedByFolder.set(folderId, nextSet);
  return nextSelectedByFolder;
};

export const clearDraftSelection = ({
  activeFolderId,
  currentView,
  folderIds,
  selectedByFolder,
}: {
  activeFolderId: string;
  currentView: ViewState;
  folderIds: string[];
  selectedByFolder: Map<string, Set<string>>;
}) => {
  const nextSelectedByFolder = cloneSelectionMap(selectedByFolder);

  if (currentView === "folder-detail") {
    nextSelectedByFolder.set(activeFolderId, new Set<string>());
    return nextSelectedByFolder;
  }

  folderIds.forEach((id) => nextSelectedByFolder.set(id, new Set<string>()));
  return nextSelectedByFolder;
};

const countSelectedTracks = (selectedByFolder: Map<string, Set<string>>) => {
  let total = 0;
  selectedByFolder.forEach((ids) => {
    total += ids.size;
  });
  return total;
};

export const useTrackSelectState = ({
  assembly,
  decorateManagedTrack,
  folders,
  maxTracksLimit,
  onClose,
  onLimitExceeded,
  open,
  trackStore,
}: {
  assembly?: Assembly;
  decorateManagedTrack?: ManagedTrackDecorator;
  folders: FolderDefinition[];
  maxTracksLimit: number;
  onClose: () => void;
  onLimitExceeded: () => void;
  open: boolean;
  trackStore?: TrackStoreInstance;
}) => {
  const folderIds = useMemo(
    () => folders.map((folder) => folder.id),
    [folders],
  );
  const [currentView, setCurrentView] = useState<ViewState>(() =>
    folders.length > 1 ? "folder-list" : "folder-detail",
  );
  const [activeFolderId, setActiveFolderId] = useState(
    () => folders[0]?.id ?? "",
  );
  const [selectedByFolder, setSelectedByFolder] = useState(
    () =>
      deriveDraftSelection({
        folders,
        tracks: trackStore?.getState().tracks,
      }).selectedByFolder,
  );

  useEffect(() => {
    setActiveFolderId((currentFolderId) => {
      if (folders.some((folder) => folder.id === currentFolderId)) {
        return currentFolderId;
      }

      return folders[0]?.id ?? "";
    });

    if (folders.length <= 1) {
      setCurrentView("folder-detail");
    }
  }, [folders]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedByFolder(
      deriveDraftSelection({
        folders,
        tracks: trackStore?.getState().tracks,
      }).selectedByFolder,
    );
  }, [folders, open, trackStore]);

  const activeFolder = useMemo(() => {
    return folders.find((folder) => folder.id === activeFolderId) ?? folders[0];
  }, [activeFolderId, folders]);

  const selectedIds = useMemo(() => {
    if (!activeFolder) {
      return new Set<string>();
    }

    return new Set(selectedByFolder.get(activeFolder.id) ?? []);
  }, [activeFolder, selectedByFolder]);

  const selectedCount = useMemo(
    () => countSelectedTracks(selectedByFolder),
    [selectedByFolder],
  );

  const handleFolderSelect = (folderId: string) => {
    setActiveFolderId(folderId);
    setCurrentView("folder-detail");
  };

  const handleNavigateToRoot = () => {
    setCurrentView("folder-list");
  };

  const handleSelectionChange = (ids: Set<string>) => {
    if (!activeFolder) {
      return;
    }

    const nextSelection = updateFolderDraftSelection({
      activeFolder,
      ids,
      maxTracksLimit,
      selectedByFolder,
    });

    if (nextSelection.overLimit) {
      onLimitExceeded();
      return;
    }

    setSelectedByFolder(nextSelection.selectedByFolder);
  };

  const handleRemoveTreeItem = (
    item: TreeViewBaseItem<ExtendedTreeItemProps>,
  ) => {
    setSelectedByFolder(
      removeTreeItemFromDraftSelection({
        item,
        selectedByFolder,
      }),
    );
  };

  const handleReset = () => {
    setSelectedByFolder(
      deriveDraftSelection({
        folders,
        tracks: trackStore?.getState().tracks,
      }).selectedByFolder,
    );
  };

  const handleClear = () => {
    setSelectedByFolder(
      clearDraftSelection({
        activeFolderId,
        currentView,
        folderIds,
        selectedByFolder,
      }),
    );
  };

  const handleSubmit = () => {
    if (assembly && trackStore) {
      const { idsToRemove, tracksToAdd } = diffManagedTracks({
        assembly,
        currentTracks: trackStore.getState().tracks,
        decorateTrack: decorateManagedTrack,
        folders,
        selectedByFolder,
      });

      const { insertTrack, removeTrack } = trackStore.getState();
      idsToRemove.forEach((id) => removeTrack(id));
      tracksToAdd.forEach((track) => insertTrack(track));
    }

    onClose();
  };

  return {
    activeFolder,
    currentView,
    handleClear,
    handleFolderSelect,
    handleNavigateToRoot,
    handleRemoveTreeItem,
    handleReset,
    handleSelectionChange,
    handleSubmit,
    selectedByFolder,
    selectedCount,
    selectedIds,
  };
};
