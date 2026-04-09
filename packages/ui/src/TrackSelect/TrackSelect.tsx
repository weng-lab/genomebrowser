import { TrackStoreInstance } from "@weng-lab/genomebrowser";
import { Box, Dialog, DialogContent } from "@mui/material";
import { useMemo, useState } from "react";
import {
  Assembly,
  FolderDefinition,
  FolderRuntimeConfig,
} from "./Folders/types";
import { ManagedTrackDecorator } from "./managedTracks";
import { updateFolderRuntimeConfigOverrides } from "./trackSelectRuntimeConfig";
import { deriveTrackSelectViewData } from "./trackSelectViewData";
import { TrackSelectContent, TrackSelectTitleBar } from "./TrackSelectLayout";
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
  const [runtimeConfigOverridesByFolder, setRuntimeConfigOverridesByFolder] =
    useState<Map<string, Partial<FolderRuntimeConfig>>>(() => new Map());
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

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  const confirmReset = () => {
    setResetDialogOpen(false);
    resetSelection();
  };

  const confirmClear = () => {
    setClearDialogOpen(false);
    clearSelection();
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

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="lg" fullWidth>
      <TrackSelectTitleBar title={title} onClose={handleCancel} />
      <DialogContent sx={{ marginTop: "5px" }}>
        {!activeFolder || !activeConfig ? (
          <Box sx={{ p: 2 }}>No folders available.</Box>
        ) : (
          <TrackSelectContent
            activeConfig={activeConfig}
            activeFolder={activeFolder}
            clearDialogOpen={clearDialogOpen}
            currentView={currentView}
            folderTrees={folderTrees}
            folders={folders}
            limitDialogOpen={limitDialogOpen}
            maxTracksLimit={maxTracksLimit}
            onCancel={handleCancel}
            onClear={() => setClearDialogOpen(true)}
            onClearDialogClose={() => setClearDialogOpen(false)}
            onClearConfirm={confirmClear}
            onFolderSelect={handleFolderSelect}
            onLimitDialogClose={() => setLimitDialogOpen(false)}
            onNavigateToRoot={handleNavigateToRoot}
            onRemoveTreeItem={handleRemoveTreeItem}
            onReset={() => setResetDialogOpen(true)}
            onResetDialogClose={() => setResetDialogOpen(false)}
            onResetConfirm={confirmReset}
            onSelectionChange={handleSelectionChange}
            onSubmit={handleSubmit}
            onUpdateActiveFolderConfig={updateActiveFolderConfig}
            resetDialogOpen={resetDialogOpen}
            rows={rows}
            selectedCount={selectedCount}
            selectedIds={selectedIds}
            showReset={Boolean(trackStore)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
