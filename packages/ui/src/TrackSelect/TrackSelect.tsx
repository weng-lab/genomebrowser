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
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataGridWrapper } from "./DataGrid/DataGridWrapper";
import { ClearDialog } from "./Dialogs/ClearDialog";
import { LimitDialog } from "./Dialogs/LimitDialog";
import { ResetDialog } from "./Dialogs/ResetDialog";
import { Breadcrumb } from "./FolderList/Breadcrumb";
import { FolderList } from "./FolderList/FolderList";
import {
  Assembly,
  FolderDefinition,
  FolderRuntimeConfig,
} from "./Folders/types";
import { ManagedTrackDecorator } from "./managedTracks";
import { deriveTrackSelectViewData } from "./trackSelectViewData";
import { TreeViewWrapper } from "./TreeView/TreeViewWrapper";
import { useTrackSelectState } from "./useTrackSelectState";

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

const buildRuntimeConfigMap = (folders: FolderDefinition[]) => {
  const map = new Map<string, FolderRuntimeConfig>();
  folders.forEach((folder) => {
    map.set(folder.id, {
      columns: folder.columns,
      groupingModel: folder.groupingModel,
      leafField: folder.leafField,
    });
  });
  return map;
};

const DEFAULT_TITLE = "Track Select";

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
  const [runtimeConfigByFolder, setRuntimeConfigByFolder] = useState(() =>
    buildRuntimeConfigMap(folders),
  );
  const maxTracksLimit = maxTracks ?? DEFAULT_MAX_TRACKS;
  const {
    activeFolderId,
    currentView,
    handleClear: clearSelection,
    handleFolderSelect,
    handleNavigateToRoot,
    handleRemoveTreeItem,
    handleReset: resetSelection,
    handleSelectionChange,
    handleSubmit,
    selectedByFolder,
  } = useTrackSelectState({
    assembly,
    decorateManagedTrack,
    folders,
    maxTracksLimit,
    onClose,
    onLimitExceeded: () => setLimitDialogOpen(true),
    open,
    trackStore,
  });

  useEffect(() => {
    setRuntimeConfigByFolder(buildRuntimeConfigMap(folders));
  }, [folders]);

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
        runtimeConfigByFolder,
        selectedByFolder,
      }),
    [activeFolderId, folders, runtimeConfigByFolder, selectedByFolder],
  );

  const updateActiveFolderConfig = useCallback(
    (partial: Partial<FolderRuntimeConfig>) => {
      if (!activeFolder) return;
      setRuntimeConfigByFolder((prev) => {
        const current = prev.get(activeFolder.id);
        if (!current) return prev;
        const next = new Map(prev);
        next.set(activeFolder.id, { ...current, ...partial });
        return next;
      });
    },
    [activeFolder],
  );

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  const openClearDialog = () => {
    setClearDialogOpen(true);
  };

  const openResetDialog = () => {
    setResetDialogOpen(true);
  };

  const confirmReset = () => {
    setResetDialogOpen(false);
    resetSelection();
  };

  const confirmClear = () => {
    setClearDialogOpen(false);
    clearSelection();
  };

  const ToolbarExtras = activeFolder?.ToolbarExtras;

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
          sx={{ color: "white", padding: 0 }}
        >
          <CloseIcon fontSize="large" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ marginTop: "5px" }}>
        {!activeFolder || !activeConfig ? (
          <Box sx={{ p: 2 }}>No folders available.</Box>
        ) : (
          <Box sx={{ flex: 1, pt: 1 }}>
            {/* Toolbar row */}
            {(folders.length > 1 ||
              (currentView === "folder-detail" && ToolbarExtras)) && (
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
                {currentView === "folder-detail" &&
                  ToolbarExtras &&
                  activeConfig && (
                    <ToolbarExtras
                      updateConfig={updateActiveFolderConfig}
                      folderId={activeFolder.id}
                      label={activeFolder.label}
                      config={activeConfig}
                    />
                  )}
              </Box>
            )}

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{ width: "100%" }}
            >
              {/* Left panel - FolderList or DataGrid */}
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
              {/* Right panel - Active Tracks */}
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
                  onClick={openClearDialog}
                >
                  Clear
                </Button>
                {trackStore && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    onClick={openResetDialog}
                  >
                    Reset
                  </Button>
                )}
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
