import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
} from "@mui/material";
import { TreeViewBaseItem } from "@mui/x-tree-view";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Breadcrumb } from "./FolderList/Breadcrumb";
import { DataGridWrapper } from "./DataGrid/DataGridWrapper";
import { FolderList } from "./FolderList/FolderList";
import { FolderDefinition, FolderRuntimeConfig } from "./Folders/types";
import { createSelectionStore, SelectionStoreInstance } from "./store";
import { TreeViewWrapper } from "./TreeView/TreeViewWrapper";
import { ExtendedTreeItemProps } from "./types";

export interface TrackSelectProps {
  folders: FolderDefinition[];
  onSubmit: (selectedByFolder: Map<string, Set<string>>) => void;
  onCancel?: () => void;
  onClear?: () => void;
  maxTracks?: number;
  storageKey?: string;
  /** Initial selection to use when no stored selection exists */
  initialSelection?: Map<string, Set<string>>;
  open: boolean;
  onClose: () => void;
  title?: string;
}

const DEFAULT_MAX_TRACKS = 30;

type ViewState = "folder-list" | "folder-detail";

const cloneSelectionMap = (selection: Map<string, Set<string>>) => {
  const map = new Map<string, Set<string>>();
  selection.forEach((ids, folderId) => {
    map.set(folderId, new Set(ids));
  });
  return map;
};

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

const attachFolderId = (
  items: TreeViewBaseItem<ExtendedTreeItemProps>[],
  folderId: string,
): TreeViewBaseItem<ExtendedTreeItemProps>[] => {
  return items.map((item) => ({
    ...item,
    folderId,
    children: item.children
      ? attachFolderId(item.children, folderId)
      : undefined,
  }));
};

const DEFAULT_TITLE = "Track Select";

export default function TrackSelect({
  folders,
  onSubmit,
  onCancel,
  onClear,
  maxTracks,
  storageKey,
  initialSelection,
  open,
  onClose,
  title = DEFAULT_TITLE,
}: TrackSelectProps) {
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [runtimeConfigByFolder, setRuntimeConfigByFolder] = useState(() =>
    buildRuntimeConfigMap(folders),
  );

  // View state: folder list or folder detail
  const [currentView, setCurrentView] = useState<ViewState>(() =>
    folders.length > 1 ? "folder-list" : "folder-detail",
  );

  // Create and memoize the selection store
  const folderIds = useMemo(() => folders.map((f) => f.id), [folders]);
  const storeRef = useRef<SelectionStoreInstance | null>(null);
  if (!storeRef.current) {
    storeRef.current = createSelectionStore(
      folderIds,
      storageKey,
      initialSelection,
    );
  }
  const store = storeRef.current;

  // Subscribe to store changes
  const selectedByFolder = store((state) => state.selectedByFolder);
  const activeFolderId = store((state) => state.activeFolderId);
  const setActiveFolder = store((state) => state.setActiveFolder);
  const setSelection = store((state) => state.setSelection);
  const clear = store((state) => state.clear);

  // Keep a committed snapshot for cancel functionality
  const [committedSnapshot, setCommittedSnapshot] = useState(() =>
    cloneSelectionMap(selectedByFolder),
  );

  useEffect(() => {
    setRuntimeConfigByFolder(buildRuntimeConfigMap(folders));
    // Ensure active folder is valid
    if (!folders.some((folder) => folder.id === activeFolderId)) {
      setActiveFolder(folders[0]?.id ?? "");
    }
    // Update view state if folder count changes
    if (folders.length <= 1) {
      setCurrentView("folder-detail");
    }
  }, [folders, activeFolderId, setActiveFolder]);

  const activeFolder = useMemo(() => {
    return folders.find((folder) => folder.id === activeFolderId) ?? folders[0];
  }, [folders, activeFolderId]);

  const activeConfig = useMemo(() => {
    if (!activeFolder) return undefined;
    return (
      runtimeConfigByFolder.get(activeFolder.id) ?? {
        columns: activeFolder.columns,
        groupingModel: activeFolder.groupingModel,
        leafField: activeFolder.leafField,
      }
    );
  }, [runtimeConfigByFolder, activeFolder]);

  const selectedIds = useMemo(() => {
    if (!activeFolder) return new Set<string>();
    return new Set(selectedByFolder.get(activeFolder.id) ?? []);
  }, [selectedByFolder, activeFolder]);

  const selectedCount = useMemo(() => {
    let total = 0;
    selectedByFolder.forEach((ids) => {
      total += ids.size;
    });
    return total;
  }, [selectedByFolder]);

  const maxTracksLimit = maxTracks ?? DEFAULT_MAX_TRACKS;

  const rows = useMemo(() => {
    if (!activeFolder) return [];
    return Array.from(activeFolder.rowById.values());
  }, [activeFolder]);

  const folderTrees = useMemo(() => {
    return folders
      .filter((folder) => {
        const selected = selectedByFolder.get(folder.id);
        return selected && selected.size > 0;
      })
      .map((folder) => ({
        folderId: folder.id,
        items: attachFolderId(
          folder.buildTree(
            Array.from(selectedByFolder.get(folder.id) ?? []),
            folder.rowById,
          ),
          folder.id,
        ),
        TreeItemComponent: folder.TreeItemComponent,
      }));
  }, [folders, selectedByFolder]);

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

  // Navigation handlers
  const handleFolderSelect = (folderId: string) => {
    setActiveFolder(folderId);
    setCurrentView("folder-detail");
  };

  const handleNavigateToRoot = () => {
    setCurrentView("folder-list");
  };

  const handleSelectionChange = (ids: Set<string>) => {
    if (!activeFolder) return;

    // Filter to only include IDs that exist in rowById (exclude auto-generated group IDs)
    const filteredIds = new Set(
      Array.from(ids).filter((id) => activeFolder.rowById.has(id)),
    );

    // Calculate what the total would be with this change
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

    setSelection(activeFolder.id, filteredIds);
  };

  const handleRemoveTreeItem = (
    item: TreeViewBaseItem<ExtendedTreeItemProps>,
  ) => {
    const folderId = item.folderId;
    if (!folderId || !item.allExpAccessions?.length) {
      return;
    }

    const current = selectedByFolder.get(folderId) ?? new Set<string>();
    const nextSet = new Set(current);
    item.allExpAccessions.forEach((id) => nextSet.delete(id));
    setSelection(folderId, nextSet);
  };

  const handleSubmit = () => {
    const committed = cloneSelectionMap(selectedByFolder);
    setCommittedSnapshot(committed);
    onSubmit(committed);
    onClose();
  };

  const handleCancel = () => {
    // Restore from committed snapshot
    committedSnapshot.forEach((ids, folderId) => {
      setSelection(folderId, ids);
    });
    onCancel?.();
    onClose();
  };

  const handleClear = () => {
    setClearDialogOpen(true);
  };

  const confirmClear = () => {
    setClearDialogOpen(false);
    let newSnapshot: Map<string, Set<string>>;

    if (currentView === "folder-detail") {
      // Clear only the current folder
      clear(activeFolderId);
      newSnapshot = cloneSelectionMap(selectedByFolder);
      newSnapshot.set(activeFolderId, new Set<string>());
    } else {
      // Clear all folders
      clear();
      newSnapshot = new Map<string, Set<string>>();
      folderIds.forEach((id) => newSnapshot.set(id, new Set<string>()));
      onClear?.();
    }

    setCommittedSnapshot(newSnapshot);
    onSubmit(newSnapshot);
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
            {/* Toolbar row - breadcrumb on left, extras on right */}
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
                {currentView === "folder-detail" && ToolbarExtras && (
                  <ToolbarExtras updateConfig={updateActiveFolderConfig} />
                )}
              </Box>
            )}

            <Stack direction="row" spacing={2} sx={{ width: "100%" }}>
              {/* Left panel - swaps between FolderList and DataGrid */}
              <Box sx={{ flex: 3, minWidth: 0 }}>
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
              {/* Right panel - always visible */}
              <Box sx={{ flex: 2, minWidth: 0 }}>
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
                mt: 2,
                gap: 2,
              }}
            >
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleClear}
              >
                Clear
              </Button>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button variant="outlined" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSubmit}
                >
                  Submit
                </Button>
              </Box>
            </Box>
            <Dialog
              open={limitDialogOpen}
              onClose={() => setLimitDialogOpen(false)}
            >
              <DialogTitle>Track Limit Reached</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  You can select up to {maxTracksLimit} tracks at a time. Please
                  remove a track before adding another.
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setLimitDialogOpen(false)} autoFocus>
                  OK
                </Button>
              </DialogActions>
            </Dialog>
            <Dialog
              open={clearDialogOpen}
              onClose={() => setClearDialogOpen(false)}
            >
              <DialogTitle
                sx={{
                  bgcolor: "#0c184a",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                {currentView === "folder-detail"
                  ? `Clear ${activeFolder.label}`
                  : "Clear All Folders"}
              </DialogTitle>
              <DialogContent sx={{ mt: 2 }}>
                <DialogContentText>
                  {currentView === "folder-detail" ? (
                    <>
                      Are you sure you want to clear the selection for{" "}
                      <strong>{activeFolder.label}</strong>?
                    </>
                  ) : (
                    "Are you sure you want to clear all selections?"
                  )}
                </DialogContentText>
              </DialogContent>
              <DialogActions sx={{ justifyContent: "center", gap: 2, pb: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setClearDialogOpen(false)}
                  autoFocus
                >
                  Cancel
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={confirmClear}
                >
                  Clear
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
