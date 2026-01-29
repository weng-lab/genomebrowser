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
import { TreeViewBaseItem } from "@mui/x-tree-view";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataGridWrapper } from "./DataGrid/DataGridWrapper";
import { ClearDialog } from "./Dialogs/ClearDialog";
import { LimitDialog } from "./Dialogs/LimitDialog";
import { ResetDialog } from "./Dialogs/ResetDialog";
import { Breadcrumb } from "./FolderList/Breadcrumb";
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
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
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
      .map((folder) => {
        const config = runtimeConfigByFolder.get(folder.id);
        const buildTree = config?.buildTree ?? folder.buildTree;

        return {
          folderId: folder.id,
          items: attachFolderId(
            buildTree(
              Array.from(selectedByFolder.get(folder.id) ?? []),
              folder.rowById,
            ),
            folder.id,
          ),
          TreeItemComponent: folder.TreeItemComponent,
        };
      });
  }, [folders, selectedByFolder, runtimeConfigByFolder]);

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

  const handleReset = () => {
    setResetDialogOpen(true);
  };

  const confirmReset = () => {
    setResetDialogOpen(false);
    if (!initialSelection) return;

    // Reset to initial selection
    initialSelection.forEach((ids, folderId) => {
      setSelection(folderId, new Set(ids));
    });
    // Clear any folders not in initialSelection
    folderIds.forEach((folderId) => {
      if (!initialSelection.has(folderId)) {
        setSelection(folderId, new Set<string>());
      }
    });

    const newSnapshot = cloneSelectionMap(initialSelection);
    setCommittedSnapshot(newSnapshot);
    onSubmit(newSnapshot);
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
                  onClick={handleClear}
                >
                  Clear
                </Button>
                {initialSelection && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    onClick={handleReset}
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
