import type {
  TrackInstance,
  TrackStoreInstance,
} from "@weng-lab/genomebrowser-v2";
import { useMemo, useState } from "react";
import { assertUniqueCatalogTrackIds } from "./catalog/catalogRows";
import {
  clearSelection,
  countSelectedTracks,
  createSelectionFromTracks,
  removeTrackIdsFromSelection,
  setFolderSelection,
} from "./catalog/catalogSelection";
import { getSelectionDiff } from "./catalog/catalogDiff";
import { TrackSelectDialog } from "./layout/trackSelectDialog";
import type { TrackSelectFolder } from "./schema/folderSchema";
import { validateJson } from "./schema/validateJson";
import type { TrackSelectScreen } from "./types";

export type TrackSelectProps = {
  open: boolean;
  onClose: () => void;
  folders: unknown[];
  useTrackStore: TrackStoreInstance;
  title?: string;
  maxTracks?: number;
};

const DEFAULT_TITLE = "Track Select";
const DEFAULT_MAX_TRACKS = 50;

export default function TrackSelect({
  open,
  onClose,
  folders,
  useTrackStore,
  title = DEFAULT_TITLE,
  maxTracks = DEFAULT_MAX_TRACKS,
}: TrackSelectProps) {
  const registry = useTrackStore((state) => state.registry);
  const tracks = useTrackStore((state) => state.tracks);
  const addTrack = useTrackStore((state) => state.addTrack);
  const removeTrack = useTrackStore((state) => state.removeTrack);
  const catalogFolders = useMemo(() => {
    const parsedFolders = folders.map((folder) =>
      validateJson(folder, registry),
    );
    assertUniqueCatalogTrackIds(parsedFolders);
    return parsedFolders;
  }, [folders, registry]);
  const catalogKey = useMemo(
    () => getCatalogKey(catalogFolders),
    [catalogFolders],
  );
  const [screen, setScreen] = useState<TrackSelectScreen>(() =>
    catalogFolders.length === 1 ? "folder-detail" : "folder-list",
  );
  const [activeFolderId, setActiveFolderId] = useState(
    () => catalogFolders[0]?.id ?? "",
  );
  const [activeViewIdByFolder, setActiveViewIdByFolder] = useState(() =>
    getInitialViewIds(catalogFolders),
  );
  const [selectedByFolder, setSelectedByFolder] = useState(() =>
    createSelectionFromTracks(catalogFolders, tracks),
  );
  const [draftResetState, setDraftResetState] = useState(() => ({
    catalogKey,
    open,
  }));
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  if (
    draftResetState.catalogKey !== catalogKey ||
    draftResetState.open !== open
  ) {
    const shouldResetDraft =
      open &&
      (!draftResetState.open || draftResetState.catalogKey !== catalogKey);
    setDraftResetState({ catalogKey, open });
    if (shouldResetDraft) {
      setSubmitError(undefined);
      setSelectedByFolder(createSelectionFromTracks(catalogFolders, tracks));
    }
  }

  const currentScreen = getCurrentScreen(screen, catalogFolders.length);
  const activeFolder =
    catalogFolders.find((folder) => folder.id === activeFolderId) ??
    catalogFolders[0];
  const activeView = activeFolder
    ? (activeFolder.views.find(
        (view) => view.id === activeViewIdByFolder.get(activeFolder.id),
      ) ?? activeFolder.views[0])
    : undefined;

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

  function setDraftSelection(nextSelectedByFolder: typeof selectedByFolder) {
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
        catalogFolders,
        selectedByFolder,
        currentScreen === "folder-detail" ? activeFolder?.id : undefined,
      ),
    );
  }

  function resetDraftSelection() {
    setSubmitError(undefined);
    setSelectedByFolder(createSelectionFromTracks(catalogFolders, tracks));
  }

  function removeSelectedTrackIds(trackIds: string[]) {
    setDraftSelection(removeTrackIdsFromSelection(selectedByFolder, trackIds));
  }

  function submitSelection() {
    setSubmitError(undefined);

    const { idsToRemove, tracksToAdd } = getSelectionDiff({
      folders: catalogFolders,
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

  return (
    <TrackSelectDialog
      open={open}
      title={title}
      folders={catalogFolders}
      screen={currentScreen}
      activeFolder={activeFolder}
      activeView={activeView}
      activeViewIdByFolder={activeViewIdByFolder}
      selectedByFolder={selectedByFolder}
      selectedTrackCount={countSelectedTracks(selectedByFolder)}
      maxTracks={maxTracks}
      limitDialogOpen={limitDialogOpen}
      submitError={submitError}
      onClose={onClose}
      onFolderSelect={selectFolder}
      onBackToFolders={() => setScreen("folder-list")}
      onViewSelect={selectView}
      onActiveFolderSelectionChange={selectActiveFolderTracks}
      onRemoveTrackIds={removeSelectedTrackIds}
      onClearSelection={clearDraftSelection}
      onResetSelection={resetDraftSelection}
      onCancel={onClose}
      onSubmit={submitSelection}
      onLimitDialogClose={() => setLimitDialogOpen(false)}
    />
  );
}

function getInitialViewIds(folders: TrackSelectFolder[]) {
  return new Map(folders.map((folder) => [folder.id, folder.views[0].id]));
}

function getCatalogKey(folders: TrackSelectFolder[]) {
  return folders
    .map((folder) => {
      const viewIds = folder.views.map((view) => view.id).join(",");
      const trackIds = folder.tracks.map((track) => track.config.id).join(",");
      return `${folder.id}:${viewIds}:${trackIds}`;
    })
    .join("|");
}

function getCurrentScreen(screen: TrackSelectScreen, folderCount: number) {
  if (folderCount === 0) return "folder-list";
  if (folderCount === 1) return "folder-detail";
  return screen;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Track Select error";
}
