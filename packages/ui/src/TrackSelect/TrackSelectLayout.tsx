import CloseIcon from "@mui/icons-material/Close";
import { Box, Button, DialogTitle, IconButton, Stack } from "@mui/material";
import { ReactNode } from "react";
import { DataGridWrapper } from "./DataGrid/DataGridWrapper";
import { ClearDialog } from "./Dialogs/ClearDialog";
import { LimitDialog } from "./Dialogs/LimitDialog";
import { ResetDialog } from "./Dialogs/ResetDialog";
import { Breadcrumb } from "./FolderList/Breadcrumb";
import { FolderList } from "./FolderList/FolderList";
import { FolderDefinition, FolderRuntimeConfig } from "./Folders/types";
import { ResolvedFolderRuntimeConfig } from "./trackSelectRuntimeConfig";
import { TreeViewWrapper } from "./TreeView/TreeViewWrapper";
import { FolderTreeConfig } from "./types";
import { ViewState } from "./useTrackSelectState";

export function TrackSelectTitleBar({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
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
      <IconButton size="large" onClick={onClose} sx={{ color: "white", p: 0 }}>
        <CloseIcon fontSize="large" />
      </IconButton>
    </DialogTitle>
  );
}

export function TrackSelectContent({
  activeConfig,
  activeFolder,
  clearDialogOpen,
  currentView,
  folderTrees,
  folders,
  limitDialogOpen,
  maxTracksLimit,
  onCancel,
  onClear,
  onClearDialogClose,
  onClearConfirm,
  onFolderSelect,
  onLimitDialogClose,
  onNavigateToRoot,
  onRemoveTreeItem,
  onReset,
  onResetDialogClose,
  onResetConfirm,
  onSelectionChange,
  onSubmit,
  onUpdateActiveFolderConfig,
  resetDialogOpen,
  rows,
  selectedCount,
  selectedIds,
  showReset,
}: {
  activeConfig: ResolvedFolderRuntimeConfig;
  activeFolder: FolderDefinition;
  clearDialogOpen: boolean;
  currentView: ViewState;
  folderTrees: FolderTreeConfig[];
  folders: FolderDefinition[];
  limitDialogOpen: boolean;
  maxTracksLimit: number;
  onCancel: () => void;
  onClear: () => void;
  onClearDialogClose: () => void;
  onClearConfirm: () => void;
  onFolderSelect: (folderId: string) => void;
  onLimitDialogClose: () => void;
  onNavigateToRoot: () => void;
  onRemoveTreeItem: (item: FolderTreeConfig["items"][number]) => void;
  onReset: () => void;
  onResetDialogClose: () => void;
  onResetConfirm: () => void;
  onSelectionChange: (ids: Set<string>) => void;
  onSubmit: () => void;
  onUpdateActiveFolderConfig: (partial: Partial<FolderRuntimeConfig>) => void;
  resetDialogOpen: boolean;
  rows: unknown[];
  selectedCount: number;
  selectedIds: Set<string>;
  showReset: boolean;
}) {
  return (
    <Box sx={{ flex: 1, pt: 1 }}>
      <TrackSelectToolbar
        activeConfig={activeConfig}
        activeFolder={activeFolder}
        currentView={currentView}
        folders={folders}
        onNavigateToRoot={onNavigateToRoot}
        onUpdateActiveFolderConfig={onUpdateActiveFolderConfig}
      />
      <TrackSelectPanels
        activeConfig={activeConfig}
        activeFolder={activeFolder}
        currentView={currentView}
        folderTrees={folderTrees}
        folders={folders}
        onFolderSelect={onFolderSelect}
        onRemoveTreeItem={onRemoveTreeItem}
        onSelectionChange={onSelectionChange}
        rows={rows}
        selectedCount={selectedCount}
        selectedIds={selectedIds}
      />
      <TrackSelectFooter
        onCancel={onCancel}
        onClear={onClear}
        onReset={onReset}
        onSubmit={onSubmit}
        showReset={showReset}
      />
      <TrackSelectDialogs
        activeFolderLabel={activeFolder.label}
        clearAll={currentView === "folder-list"}
        clearDialogOpen={clearDialogOpen}
        limitDialogOpen={limitDialogOpen}
        maxTracks={maxTracksLimit}
        onClearDialogClose={onClearDialogClose}
        onClearConfirm={onClearConfirm}
        onLimitDialogClose={onLimitDialogClose}
        onResetDialogClose={onResetDialogClose}
        onResetConfirm={onResetConfirm}
        resetDialogOpen={resetDialogOpen}
      />
    </Box>
  );
}

function TrackSelectToolbar({
  activeConfig,
  activeFolder,
  currentView,
  folders,
  onNavigateToRoot,
  onUpdateActiveFolderConfig,
}: {
  activeConfig: ResolvedFolderRuntimeConfig;
  activeFolder: FolderDefinition;
  currentView: ViewState;
  folders: FolderDefinition[];
  onNavigateToRoot: () => void;
  onUpdateActiveFolderConfig: (partial: Partial<FolderRuntimeConfig>) => void;
}) {
  const ToolbarExtras = activeFolder.ToolbarExtras;

  if (
    folders.length <= 1 &&
    (currentView !== "folder-detail" || !ToolbarExtras)
  ) {
    return null;
  }

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      sx={{ mb: 2 }}
    >
      {folders.length > 1 ? (
        <Breadcrumb
          currentFolder={currentView === "folder-detail" ? activeFolder : null}
          onNavigateToRoot={onNavigateToRoot}
        />
      ) : (
        <Box />
      )}
      {currentView === "folder-detail" && ToolbarExtras ? (
        <ToolbarExtras
          updateConfig={onUpdateActiveFolderConfig}
          folderId={activeFolder.id}
          label={activeFolder.label}
          config={activeConfig}
        />
      ) : null}
    </Box>
  );
}

function TrackSelectPanels({
  activeConfig,
  activeFolder,
  currentView,
  folderTrees,
  folders,
  onFolderSelect,
  onRemoveTreeItem,
  onSelectionChange,
  rows,
  selectedCount,
  selectedIds,
}: {
  activeConfig: ResolvedFolderRuntimeConfig;
  activeFolder: FolderDefinition;
  currentView: ViewState;
  folderTrees: FolderTreeConfig[];
  folders: FolderDefinition[];
  onFolderSelect: (folderId: string) => void;
  onRemoveTreeItem: (item: FolderTreeConfig["items"][number]) => void;
  onSelectionChange: (ids: Set<string>) => void;
  rows: unknown[];
  selectedCount: number;
  selectedIds: Set<string>;
}) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      sx={{ width: "100%" }}
    >
      <TrackSelectPanel flex={{ xs: "none", md: 3 }}>
        {currentView === "folder-list" ? (
          <FolderList folders={folders} onFolderSelect={onFolderSelect} />
        ) : (
          <DataGridWrapper
            rows={rows}
            columns={activeConfig.columns}
            groupingModel={activeConfig.groupingModel}
            leafField={activeConfig.leafField}
            label={`${rows.length} Available ${activeFolder.label}`}
            selectedIds={selectedIds}
            onSelectionChange={onSelectionChange}
            GroupingCellComponent={activeFolder.GroupingCellComponent}
          />
        )}
      </TrackSelectPanel>
      <TrackSelectPanel flex={{ xs: "none", md: 2 }}>
        <TreeViewWrapper
          folderTrees={folderTrees}
          selectedCount={selectedCount}
          onRemove={onRemoveTreeItem}
        />
      </TrackSelectPanel>
    </Stack>
  );
}

function TrackSelectPanel({
  children,
  flex,
}: {
  children: ReactNode;
  flex: { xs: string; md: number };
}) {
  return (
    <Box
      sx={{
        flex,
        minWidth: 0,
        width: { xs: "100%", md: "auto" },
      }}
    >
      {children}
    </Box>
  );
}

function TrackSelectFooter({
  onCancel,
  onClear,
  onReset,
  onSubmit,
  showReset,
}: {
  onCancel: () => void;
  onClear: () => void;
  onReset: () => void;
  onSubmit: () => void;
  showReset: boolean;
}) {
  return (
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
          onClick={onClear}
        >
          Clear
        </Button>
        {showReset ? (
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            onClick={onReset}
          >
            Reset
          </Button>
        ) : null}
      </Box>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variant="outlined" size="small" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={onSubmit}
        >
          Submit
        </Button>
      </Box>
    </Box>
  );
}

function TrackSelectDialogs({
  activeFolderLabel,
  clearAll,
  clearDialogOpen,
  limitDialogOpen,
  maxTracks,
  onClearDialogClose,
  onClearConfirm,
  onLimitDialogClose,
  onResetDialogClose,
  onResetConfirm,
  resetDialogOpen,
}: {
  activeFolderLabel: string;
  clearAll: boolean;
  clearDialogOpen: boolean;
  limitDialogOpen: boolean;
  maxTracks: number;
  onClearDialogClose: () => void;
  onClearConfirm: () => void;
  onLimitDialogClose: () => void;
  onResetDialogClose: () => void;
  onResetConfirm: () => void;
  resetDialogOpen: boolean;
}) {
  return (
    <>
      <LimitDialog
        open={limitDialogOpen}
        onClose={onLimitDialogClose}
        maxTracks={maxTracks}
      />
      <ClearDialog
        open={clearDialogOpen}
        onClose={onClearDialogClose}
        onConfirm={onClearConfirm}
        folderLabel={activeFolderLabel}
        clearAll={clearAll}
      />
      <ResetDialog
        open={resetDialogOpen}
        onClose={onResetDialogClose}
        onConfirm={onResetConfirm}
      />
    </>
  );
}
