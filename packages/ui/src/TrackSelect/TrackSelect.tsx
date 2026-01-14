import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Tab,
  Tabs,
} from "@mui/material";
import { TreeViewBaseItem } from "@mui/x-tree-view";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataGridWrapper } from "./DataGrid/DataGridWrapper";
import { FolderDefinition, FolderRuntimeConfig } from "./folders/types";
import { createSelectionStore, SelectionStoreInstance } from "./store";
import { TreeViewWrapper } from "./TreeView/TreeViewWrapper";
import { ExtendedTreeItemProps } from "./types";

export interface TrackSelectProps {
  folders: FolderDefinition[];
  onSubmit: (selectedByFolder: Map<string, Set<string>>) => void;
  onCancel?: () => void;
  onReset?: () => void;
  maxTracks?: number;
  storageKey?: string;
}

const DEFAULT_MAX_TRACKS = 30;

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

export default function TrackSelect({
  folders,
  onSubmit,
  onCancel,
  onReset,
  maxTracks,
  storageKey,
}: TrackSelectProps) {
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [runtimeConfigByFolder, setRuntimeConfigByFolder] = useState(() =>
    buildRuntimeConfigMap(folders),
  );

  // Create and memoize the selection store
  const folderIds = useMemo(() => folders.map((f) => f.id), [folders]);
  const storeRef = useRef<SelectionStoreInstance | null>(null);
  if (!storeRef.current) {
    storeRef.current = createSelectionStore(folderIds, storageKey);
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

  const treeItems = useMemo(() => {
    if (!activeFolder) return [];
    return folders.flatMap((folder) =>
      attachFolderId(
        folder.buildTree(
          Array.from(selectedByFolder.get(folder.id) ?? []),
          folder.rowById,
        ),
        folder.id,
      ),
    );
  }, [folders, selectedByFolder, activeFolder]);

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
  };

  const handleCancel = () => {
    // Restore from committed snapshot
    committedSnapshot.forEach((ids, folderId) => {
      setSelection(folderId, ids);
    });
    onCancel?.();
  };

  const handleReset = () => {
    clear();
    setCommittedSnapshot(new Map());
    onReset?.();
  };

  if (!activeFolder || !activeConfig) {
    return <Box sx={{ p: 2 }}>No folders available.</Box>;
  }

  const ToolbarExtras = activeFolder.ToolbarExtras;

  return (
    <Box sx={{ flex: 1, pt: 1 }}>
      {(folders.length > 1 || ToolbarExtras) && (
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 3 }}
        >
          {folders.length > 1 ? (
            <Tabs
              value={activeFolder.id}
              onChange={(_event, value) => setActiveFolder(value)}
            >
              {folders.map((folder) => (
                <Tab key={folder.id} label={folder.label} value={folder.id} />
              ))}
            </Tabs>
          ) : (
            <Box />
          )}
          {ToolbarExtras && (
            <ToolbarExtras updateConfig={updateActiveFolderConfig} />
          )}
        </Box>
      )}
      <Stack direction="row" spacing={2} sx={{ width: "100%" }}>
        <Box sx={{ flex: 3, minWidth: 0 }}>
          <DataGridWrapper
            rows={rows}
            columns={activeConfig.columns}
            groupingModel={activeConfig.groupingModel}
            leafField={activeConfig.leafField}
            label={`${rows.length} Available ${activeFolder.label}`}
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
          />
        </Box>
        <Box sx={{ flex: 2, minWidth: 0 }}>
          <TreeViewWrapper
            items={treeItems}
            selectedCount={selectedCount}
            onRemove={handleRemoveTreeItem}
          />
        </Box>
      </Stack>
      <Box
        sx={{ display: "flex", justifyContent: "space-between", mt: 2, gap: 2 }}
      >
        <Button variant="outlined" color="secondary" onClick={handleReset}>
          Reset
        </Button>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="outlined" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" onClick={handleSubmit}>
            Submit
          </Button>
        </Box>
      </Box>
      <Dialog open={limitDialogOpen} onClose={() => setLimitDialogOpen(false)}>
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
    </Box>
  );
}
