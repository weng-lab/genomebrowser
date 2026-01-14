import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import { GridRowSelectionModel } from "@mui/x-data-grid-premium";
import { TreeViewBaseItem } from "@mui/x-tree-view";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { DataGridWrapper } from "./DataGrid/DataGridWrapper";
import {
  flattenIntoRows,
  searchTracks,
  getTracksData,
} from "./DataGrid/dataGridHelpers";
import { TreeViewWrapper } from "./TreeView/TreeViewWrapper";
import {
  buildSortedAssayTreeView,
  buildTreeView,
  searchTreeItems,
} from "./TreeView/treeViewHelpers";
import { SelectionStoreInstance } from "./store";
import { ExtendedTreeItemProps, SearchTracksProps } from "./types";

export interface TrackSelectProps {
  store: SelectionStoreInstance;
  onSubmit?: (trackIds: Set<string>) => void;
  onCancel?: () => void;
  onReset?: () => void;
}

export default function TrackSelect({
  store,
  onSubmit,
  onCancel,
  onReset,
}: TrackSelectProps) {
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [sortedAssay, setSortedAssay] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchResult, setIsSearchResult] = useState(false);
  const selectedIds = store((s) => s.selectedIds);
  const setSelected = store((s) => s.setSelected);
  const clear = store((s) => s.clear);
  const MAX_ACTIVE = store((s) => s.maxTracks);
  const rows = store((s) => s.rows);
  const rowById = store((s) => s.rowById);
  const assembly = store((s) => s.assembly);

  // Local working state - changes here don't affect the store until Submit
  const [workingIds, setWorkingIds] = useState<Set<string>>(
    () => new Set(selectedIds),
  );

  // Get tracks data for search functionality
  const tracksData = useMemo(
    () => getTracksData(assembly as "GRCh38" | "mm10"),
    [assembly],
  );

  // Get only real track IDs from working selection (no auto-generated group IDs)
  const workingTrackIds = useMemo(() => {
    return new Set([...workingIds].filter((id) => rowById.has(id)));
  }, [workingIds, rowById]);

  // Sync workingIds when store's selectedIds changes externally
  useEffect(() => {
    setWorkingIds(new Set(selectedIds));
  }, [selectedIds]);

  const treeItems = useMemo(() => {
    return sortedAssay
      ? buildSortedAssayTreeView(
          Array.from(workingTrackIds),
          {
            id: "1",
            isAssayItem: false,
            label: "Biosamples",
            icon: "folder",
            children: [],
            allRowInfo: [],
          },
          rowById,
        )
      : buildTreeView(
          Array.from(workingTrackIds),
          {
            id: "1",
            isAssayItem: false,
            label: "Biosamples",
            icon: "folder",
            children: [],
            allRowInfo: [],
          },
          rowById,
        );
  }, [workingTrackIds, sortedAssay, rowById]);

  const [filteredRows, setFilteredRows] = useState(rows);
  const [filteredTreeItems, setFilteredTreeItems] = useState([
    {
      id: "1",
      isAssayItem: false,
      label: "Biosamples",
      icon: "folder",
      children: [],
      allRowInfo: [],
    },
  ] as TreeViewBaseItem<ExtendedTreeItemProps>[]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchResultIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (searchQuery === "") {
      setFilteredTreeItems(treeItems);
      setFilteredRows(rows);
      setIsSearchResult(false);
      searchResultIdsRef.current = new Set();
    } else if (searchResultIdsRef.current.size > 0) {
      // When selection changes during search, rebuild tree from selected items that match search
      const matchingTrackIds = Array.from(workingTrackIds).filter((id) =>
        searchResultIdsRef.current.has(id),
      );

      const newTreeItems = sortedAssay
        ? buildSortedAssayTreeView(
            matchingTrackIds,
            {
              id: "1",
              isAssayItem: false,
              label: "Biosamples",
              icon: "folder",
              children: [],
              allRowInfo: [],
            },
            rowById,
          )
        : buildTreeView(
            matchingTrackIds,
            {
              id: "1",
              isAssayItem: false,
              label: "Biosamples",
              icon: "folder",
              children: [],
              allRowInfo: [],
            },
            rowById,
          );

      setFilteredTreeItems(newTreeItems);
    }
  }, [treeItems, searchQuery, workingTrackIds, sortedAssay, rowById, rows]);

  const handleToggle = () => {
    setSortedAssay(!sortedAssay);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce the search
    searchTimeoutRef.current = setTimeout(() => {
      if (query === "") {
        return; // useEffect handles empty query
      }

      const dataGridSearchProps = {
        jsonStructure: "tracks",
        query: query,
        keyWeightMap: [
          "displayname",
          "ontology",
          "lifeStage",
          "sampleType",
          "type",
          "experimentAccession",
          "fileAccession",
        ],
        tracksData,
      };

      const treeSearchProps: SearchTracksProps = {
        treeItems: treeItems,
        query: query,
        keyWeightMap: [
          "displayname",
          "ontology",
          "lifeStage",
          "sampleType",
          "type",
          "experimentAccession",
          "fileAccession",
        ],
      };
      const newDataGridRows = searchTracks(dataGridSearchProps)
        .map((t) => t.item)
        .flatMap(flattenIntoRows);

      // we only want the intersection of filtered tracks displayed on the DataGrid and user-selected tracks to be displayed on the tree
      const newDataGridIds = newDataGridRows.map((r) => r.id);
      const retIds = searchTreeItems(treeSearchProps).map((r) => r.item.id);
      const newTreeIds = retIds.filter((i) => newDataGridIds.includes(i));

      // build new tree from the newTreeIds
      const newTreeItems = sortedAssay
        ? buildSortedAssayTreeView(
            newTreeIds,
            {
              id: "1",
              isAssayItem: false,
              label: "Biosamples",
              icon: "folder",
              children: [],
              allRowInfo: [],
            },
            rowById,
          )
        : buildTreeView(
            newTreeIds,
            {
              id: "1",
              isAssayItem: false,
              label: "Biosamples",
              icon: "folder",
              children: [],
              allRowInfo: [],
            },
            rowById,
          );

      // Store search result IDs in ref for use in useEffect
      searchResultIdsRef.current = new Set(newDataGridIds);

      setFilteredRows(newDataGridRows);
      setIsSearchResult(true);
      setFilteredTreeItems(newTreeItems);
    }, 300);
  };

  const handleSelection = (newSelection: GridRowSelectionModel) => {
    const allIds: Set<string> =
      (newSelection && (newSelection as any).ids) ?? new Set<string>();

    // Count only real track IDs for the limit check
    let realTrackCount = 0;
    allIds.forEach((id: string) => {
      if (rowById.has(id)) {
        realTrackCount++;
      }
    });

    // Block only if the new selection would exceed the limit
    if (realTrackCount > MAX_ACTIVE) {
      setLimitDialogOpen(true);
      return;
    }

    // Update working state (not the store yet)
    setWorkingIds(allIds);
  };

  const handleRemoveTreeItem = (
    item: TreeViewBaseItem<ExtendedTreeItemProps>,
  ) => {
    const removedIds = item.allExpAccessions;
    if (!removedIds || removedIds.length === 0) {
      return;
    }

    const idsToRemove = new Set(removedIds);
    removedIds.forEach((id) => {
      const row = rowById.get(id);
      if (row) {
        idsToRemove.add(`auto-generated-row-ontology/${row.ontology}`);
        idsToRemove.add(
          `auto-generated-row-ontology/${row.ontology}-displayname/${row.displayname}`,
        );
        idsToRemove.add(`auto-generated-row-assay/${row.assay}`);
        idsToRemove.add(
          `auto-generated-row-assay/${row.assay}-ontology/${row.ontology}`,
        );
      }
    });

    const nextWorkingIds = new Set(workingIds);
    idsToRemove.forEach((id) => nextWorkingIds.delete(id));
    setWorkingIds(nextWorkingIds);
  };

  const handleSubmit = () => {
    // Commit working selection to store
    setSelected(workingIds);
    // Call callback with real track IDs
    onSubmit?.(workingTrackIds);
  };

  const handleCancel = () => {
    // Revert working state to store's committed state
    setWorkingIds(new Set(selectedIds));
    onCancel?.();
  };

  return (
    <Box sx={{ flex: 1, pt: 1 }}>
      <Box display="flex" justifyContent="space-between" sx={{ mb: 3 }}>
        <TextField
          id="outlined-suffix-shrink"
          label="Search tracks"
          variant="outlined"
          onChange={handleSearch}
          sx={{ width: "400px" }}
        />
        <FormControlLabel
          sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}
          value="Sort by assay"
          control={<Switch color="primary" onChange={handleToggle} />}
          label="Sort by assay"
          labelPlacement="end"
        />
      </Box>
      <Stack direction="row" spacing={2} sx={{ width: "100%" }}>
        <Box sx={{ flex: 3, minWidth: 0 }}>
          <DataGridWrapper
            rows={filteredRows}
            label={
              isSearchResult
                ? `${filteredRows.length} Search Results`
                : `${rows.length} Available Tracks`
            }
            selectedIds={workingIds}
            handleSelection={handleSelection}
            sortedAssay={sortedAssay}
          />
        </Box>
        <Box sx={{ flex: 2, minWidth: 0 }}>
          <TreeViewWrapper
            items={filteredTreeItems}
            selectedCount={workingTrackIds.size}
            onRemove={handleRemoveTreeItem}
          />
        </Box>
      </Stack>
      <Box
        sx={{ display: "flex", justifyContent: "space-between", mt: 2, gap: 2 }}
      >
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            if (onReset) {
              onReset();
            } else {
              clear();
              setWorkingIds(new Set());
            }
          }}
        >
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
            You can select up to {MAX_ACTIVE} tracks at a time. Please remove a
            track before adding another.
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
