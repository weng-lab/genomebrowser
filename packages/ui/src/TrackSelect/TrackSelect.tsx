import { TreeViewBaseItem } from "@mui/x-tree-view";
import { TrackStoreInstance } from "@weng-lab/genomebrowser";
import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import {
  Assembly,
  FolderDefinition,
  FolderRuntimeConfig,
} from "./Folders/types";
import { DataGridWrapper } from "./DataGrid/DataGridWrapper";
import { ClearDialog } from "./Dialogs/ClearDialog";
import { LimitDialog } from "./Dialogs/LimitDialog";
import { ResetDialog } from "./Dialogs/ResetDialog";
import { Breadcrumb } from "./FolderList/Breadcrumb";
import { FolderList } from "./FolderList/FolderList";
import {
  createEmptyManagedDraftSelection,
  deriveManagedDraftSelectionFromTracks,
  diffManagedTracks,
  ManagedTrackDecorator,
} from "./managedTracks";
import { updateFolderRuntimeConfigOverrides } from "./trackSelectRuntimeConfig";
import { deriveTrackSelectViewData } from "./trackSelectViewData";
import { ExtendedTreeItemProps } from "./types";
import { TreeViewWrapper } from "./TreeView/TreeViewWrapper";

export interface TrackSelectProps {
  assembly?: Assembly;
  folders: FolderDefinition[];
  trackStore?: TrackStoreInstance;
  onCancel?: () => void;
  maxTracks?: number;
  decorateManagedTrack?: ManagedTrackDecorator;
  open: boolean;
  onClose: () => void;
  title?: string;
}

const DEFAULT_MAX_TRACKS = 30;

const DEFAULT_TITLE = "Track Select";

type ViewState = "folder-list" | "folder-detail";

export default function TrackSelect({
  assembly,
  folders,
  trackStore,
  onCancel,
  maxTracks,
  decorateManagedTrack,
  open,
  onClose,
  title = DEFAULT_TITLE,
}: TrackSelectProps) {
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [runtimeConfigOverridesByFolder, setRuntimeConfigOverridesByFolder] =
    useState<Map<string, Partial<FolderRuntimeConfig>>>(() => new Map());
  const [currentView, setCurrentView] = useState<ViewState>(() =>
    folders.length > 1 ? "folder-list" : "folder-detail",
  );
  const [activeFolderId, setActiveFolderId] = useState(
    () => folders[0]?.id ?? "",
  );
  const [selectedByFolder, setSelectedByFolder] = useState(() => {
    if (!trackStore) {
      return createEmptyManagedDraftSelection(folders).selectedByFolder;
    }

    return deriveManagedDraftSelectionFromTracks({
      folders,
      tracks: trackStore.getState().tracks,
    }).selectedByFolder;
  });
  const maxTracksLimit = maxTracks ?? DEFAULT_MAX_TRACKS;

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

    if (!trackStore) {
      setSelectedByFolder(
        createEmptyManagedDraftSelection(folders).selectedByFolder,
      );
      return;
    }

    setSelectedByFolder(
      deriveManagedDraftSelectionFromTracks({
        folders,
        tracks: trackStore.getState().tracks,
      }).selectedByFolder,
    );
  }, [folders, open, trackStore]);

  const {
    activeConfig,
    activeFolder,
    folderTrees,
    rows,
    selectedCount,
    selectedIds,
  } = useMemo(
    () =>
      deriveTrackSelectViewData({
        activeFolderId,
        folders,
        runtimeConfigOverridesByFolder,
        selectedByFolder,
      }),
    [activeFolderId, folders, runtimeConfigOverridesByFolder, selectedByFolder],
  );

  const handleFolderSelect = (folderId: string) => {
    setActiveFolderId(folderId);
    setCurrentView("folder-detail");
  };

  const handleNavigateToRoot = () => {
    setCurrentView("folder-list");
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  const ToolbarExtras = activeFolder?.ToolbarExtras;

  const confirmReset = () => {
    setResetDialogOpen(false);

    if (!trackStore) {
      setSelectedByFolder(
        createEmptyManagedDraftSelection(folders).selectedByFolder,
      );
      return;
    }

    setSelectedByFolder(
      deriveManagedDraftSelectionFromTracks({
        folders,
        tracks: trackStore.getState().tracks,
      }).selectedByFolder,
    );
  };

  const confirmClear = () => {
    setClearDialogOpen(false);

    const nextSelectedByFolder = new Map(selectedByFolder);

    if (currentView === "folder-detail") {
      nextSelectedByFolder.set(activeFolderId, new Set<string>());
    } else {
      folders.forEach((folder) =>
        nextSelectedByFolder.set(folder.id, new Set<string>()),
      );
    }

    setSelectedByFolder(nextSelectedByFolder);
  };

  const updateActiveFolderConfig = (partial: Partial<FolderRuntimeConfig>) => {
    if (!activeFolder) {
      return;
    }

    setRuntimeConfigOverridesByFolder((prev) =>
      updateFolderRuntimeConfigOverrides({
        folder: activeFolder,
        partial,
        runtimeConfigOverridesByFolder: prev,
      }),
    );
  };

  const handleSelectionChange = (ids: Set<string>) => {
    if (!activeFolder) {
      return;
    }

    const filteredIds = new Set(
      Array.from(ids).filter((id) =>
        activeFolder.rows.some((row) => row.id === id),
      ),
    );

    let nextTotal = filteredIds.size;
    selectedByFolder.forEach((folderIds, folderId) => {
      if (folderId !== activeFolder.id) {
        nextTotal += folderIds.size;
      }
    });

    if (nextTotal > maxTracksLimit) {
      setLimitDialogOpen(true);
      return;
    }

    const nextSelectedByFolder = new Map(selectedByFolder);
    nextSelectedByFolder.set(activeFolder.id, filteredIds);
    setSelectedByFolder(nextSelectedByFolder);
  };

  const handleRemoveTreeItem = (
    item: TreeViewBaseItem<ExtendedTreeItemProps>,
  ) => {
    const folderId = item.folderId;
    if (!folderId || !item.allExpAccessions?.length) {
      return;
    }

    const nextSelectedByFolder = new Map(selectedByFolder);
    const nextSet = new Set(
      nextSelectedByFolder.get(folderId) ?? new Set<string>(),
    );
    item.allExpAccessions.forEach((id) => nextSet.delete(id));
    nextSelectedByFolder.set(folderId, nextSet);
    setSelectedByFolder(nextSelectedByFolder);
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

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: "#0c184a",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: "bold",
        }}
      >
        {title}
        <IconButton
          size="large"
          onClick={handleCancel}
          sx={{ color: "white", p: 0 }}
        >
          <CloseIcon fontSize="large" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ marginTop: "5px" }}>
        {!activeFolder || !activeConfig ? (
          <Box sx={{ p: 2 }}>No folders available.</Box>
        ) : (
          <Box sx={{ flex: 1, pt: 1 }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              {folders.length > 1 ? (
                <Breadcrumb
                  currentFolder={
                    currentView === "folder-detail" ? activeFolder : null
                  }
                  onNavigateToRoot={handleNavigateToRoot}
                />
              ) : (
                <Box />
              )}
              {currentView === "folder-detail" && ToolbarExtras ? (
                <ToolbarExtras
                  updateConfig={updateActiveFolderConfig}
                  folderId={activeFolder.id}
                  label={activeFolder.label}
                  config={activeConfig}
                />
              ) : null}
            </Box>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{ width: "100%" }}
            >
              <Box
                sx={{
                  flex: { xs: "none", md: 3 },
                  minWidth: 0,
                  width: { xs: "100%", md: "auto" },
                }}
              >
                {currentView === "folder-list" ? (
                  <FolderList
                    folders={folders}
                    onFolderSelect={handleFolderSelect}
                  />
                ) : (
                  <DataGridWrapper
                    rows={rows}
                    columns={activeConfig.columns}
                    groupingModel={activeConfig.groupingModel}
                    leafField={activeConfig.leafField}
                    label={`${rows.length} Available ${activeFolder.label}`}
                    selectedIds={selectedIds}
                    onSelectionChange={handleSelectionChange}
                    GroupingCellComponent={activeFolder.GroupingCellComponent}
                  />
                )}
              </Box>
              <Box
                sx={{
                  flex: { xs: "none", md: 2 },
                  minWidth: 0,
                  width: { xs: "100%", md: "auto" },
                }}
              >
                <TreeViewWrapper
                  folderTrees={folderTrees}
                  selectedCount={selectedCount}
                  onRemove={handleRemoveTreeItem}
                />
              </Box>
            </Stack>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mt: 2,
                gap: 1,
              }}
            >
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  onClick={() => setClearDialogOpen(true)}
                >
                  Clear
                </Button>
                {Boolean(trackStore) ? (
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    onClick={() => setResetDialogOpen(true)}
                  >
                    Reset
                  </Button>
                ) : null}
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button variant="outlined" size="small" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={handleSubmit}
                >
                  Submit
                </Button>
              </Box>
            </Box>
            <LimitDialog
              open={limitDialogOpen}
              onClose={() => setLimitDialogOpen(false)}
              maxTracks={maxTracksLimit}
            />
            <ClearDialog
              open={clearDialogOpen}
              onClose={() => setClearDialogOpen(false)}
              onConfirm={confirmClear}
              folderLabel={activeFolder.label}
              clearAll={currentView === "folder-list"}
            />
            <ResetDialog
              open={resetDialogOpen}
              onClose={() => setResetDialogOpen(false)}
              onConfirm={confirmReset}
            />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
