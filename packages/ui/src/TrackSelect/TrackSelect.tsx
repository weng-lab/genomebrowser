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
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataGridWrapper } from "./DataGrid/DataGridWrapper";
import { FolderDefinition, FolderRuntimeConfig } from "./folders/types";
import { TreeViewWrapper } from "./TreeView/TreeViewWrapper";
import { ExtendedTreeItemProps } from "./types";

export interface TrackSelectProps {
  folders: FolderDefinition[];
  onSubmit: (selectedByFolder: Map<string, Set<string>>) => void;
  onCancel?: () => void;
  onReset?: () => void;
  maxTracks?: number;
  initialSelection?: Map<string, Set<string>>;
}

const DEFAULT_MAX_TRACKS = 30;

const buildSelectionMap = (
  folders: FolderDefinition[],
  initialSelection?: Map<string, Set<string>>,
) => {
  const map = new Map<string, Set<string>>();
  folders.forEach((folder) => {
    const initial = initialSelection?.get(folder.id);
    map.set(folder.id, initial ? new Set(initial) : new Set<string>());
  });
  return map;
};

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

const getTotalSelectedCount = (selection: Map<string, Set<string>>) => {
  let total = 0;
  selection.forEach((ids) => {
    total += ids.size;
  });
  return total;
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
  initialSelection,
}: TrackSelectProps) {
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState(folders[0]?.id ?? "");
  const [committedSelection, setCommittedSelection] = useState(() =>
    buildSelectionMap(folders, initialSelection),
  );
  const [workingSelection, setWorkingSelection] = useState(() =>
    buildSelectionMap(folders, initialSelection),
  );
  const [runtimeConfigByFolder, setRuntimeConfigByFolder] = useState(() =>
    buildRuntimeConfigMap(folders),
  );

  useEffect(() => {
    const nextSelection = buildSelectionMap(folders, initialSelection);
    setCommittedSelection(nextSelection);
    setWorkingSelection(nextSelection);
    setRuntimeConfigByFolder(buildRuntimeConfigMap(folders));
    setActiveFolderId((prev) => {
      if (folders.some((folder) => folder.id === prev)) {
        return prev;
      }
      return folders[0]?.id ?? "";
    });
  }, [folders, initialSelection]);

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
    return new Set(workingSelection.get(activeFolder.id) ?? []);
  }, [workingSelection, activeFolder]);

  const selectedCount = useMemo(
    () => getTotalSelectedCount(workingSelection),
    [workingSelection],
  );

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
          Array.from(workingSelection.get(folder.id) ?? []),
          folder.rowById,
        ),
        folder.id,
      ),
    );
  }, [folders, workingSelection, activeFolder]);

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

    const nextSelection = cloneSelectionMap(workingSelection);
    nextSelection.set(activeFolder.id, filteredIds);

    if (getTotalSelectedCount(nextSelection) > maxTracksLimit) {
      setLimitDialogOpen(true);
      return;
    }

    setWorkingSelection(nextSelection);
  };

  const handleRemoveTreeItem = (
    item: TreeViewBaseItem<ExtendedTreeItemProps>,
  ) => {
    const folderId = item.folderId;
    if (!folderId || !item.allExpAccessions?.length) {
      return;
    }

    const nextSelection = cloneSelectionMap(workingSelection);
    const current = nextSelection.get(folderId) ?? new Set<string>();
    item.allExpAccessions.forEach((id) => current.delete(id));
    nextSelection.set(folderId, new Set(current));
    setWorkingSelection(nextSelection);
  };

  const handleSubmit = () => {
    const committed = cloneSelectionMap(workingSelection);
    setCommittedSelection(committed);
    onSubmit(committed);
  };

  const handleCancel = () => {
    setWorkingSelection(cloneSelectionMap(committedSelection));
    onCancel?.();
  };

  const handleReset = () => {
    const cleared = buildSelectionMap(folders);
    setWorkingSelection(cleared);
    setCommittedSelection(cleared);
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
              onChange={(_event, value) => setActiveFolderId(value)}
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
