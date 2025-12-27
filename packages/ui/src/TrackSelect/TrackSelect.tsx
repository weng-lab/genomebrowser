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
import { GridRowSelectionModel } from "@mui/x-data-grid";
import { TreeViewBaseItem } from "@mui/x-tree-view";
import React, { useEffect, useMemo, useState } from "react";
import { DataGridWrapper } from "./DataGrid/DataGridWrapper";
import { flattenIntoRow, searchTracks } from "./DataGrid/dataGridHelpers";
import { TreeViewWrapper } from "./TreeView/TreeViewWrapper";
import {
  buildSortedAssayTreeView,
  buildTreeView,
  searchTreeItems,
} from "./TreeView/treeViewHelpers";
import { rowById, rows } from "./consts";
import { SelectionStoreInstance } from "./store";
import { ExtendedTreeItemProps, SearchTracksProps } from "./types";

export interface TrackSelectProps {
  store: SelectionStoreInstance;
}

export default function TrackSelect({ store }: TrackSelectProps) {
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [sortedAssay, setSortedAssay] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchResult, setIsSearchResult] = useState(false);
  const selectedIds = store((s) => s.selectedIds);
  const getTrackIds = store((s) => s.getTrackIds);
  const setSelected = store((s) => s.setSelected);
  const clear = store((s) => s.clear);
  const MAX_ACTIVE = store((s) => s.maxTracks);

  // Get only real track IDs (no auto-generated group IDs)
  const trackIds = useMemo(() => getTrackIds(), [selectedIds, getTrackIds]);

  const treeItems = useMemo(() => {
    return sortedAssay
      ? buildSortedAssayTreeView(
          Array.from(trackIds),
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
          Array.from(trackIds),
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
  }, [trackIds, sortedAssay]);

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

  useEffect(() => {
    if (searchQuery === "") {
      setFilteredTreeItems(treeItems);
      setFilteredRows(rows);
      setIsSearchResult(false);
    }
  }, [treeItems, searchQuery]);

  const handleToggle = () => {
    setSortedAssay(!sortedAssay);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);

    const dataGridSearchProps: SearchTracksProps = {
      jsonStructure: "tracks",
      query: e.target.value,
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

    const treeSearchProps: SearchTracksProps = {
      treeItems: treeItems,
      query: e.target.value,
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
      .map(flattenIntoRow);

    // we only want the intersection of filtered tracks displayed on the DataGrid and user-selected tracks to be displayed on the tree
    const newDataGridIds = newDataGridRows.map((r) => r.experimentAccession);
    const retIds = searchTreeItems(treeSearchProps).map(
      (r) => r.item.experimentAccession,
    );
    const newTreeIds = retIds.filter((i) => newDataGridIds.includes(i));

    // build new tree from the newTreeIds...maybe it would be faster to prune the current tree instead of rebuilding it?
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

    setFilteredRows(newDataGridRows);
    setIsSearchResult(true);
    setFilteredTreeItems(newTreeItems);
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

    // Store ALL IDs (including auto-generated group IDs)
    setSelected(allIds);
  };

  return (
    <Box sx={{ flex: 1 }}>
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
            selectedIds={selectedIds}
            handleSelection={handleSelection}
            sortedAssay={sortedAssay}
          />
        </Box>
        <Box sx={{ flex: 2, minWidth: 0 }}>
          <TreeViewWrapper
            store={store}
            items={filteredTreeItems}
            trackIds={trackIds}
            isSearchResult={isSearchResult}
          />
        </Box>
      </Stack>
      <Box sx={{ justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          color="primary"
          onClick={clear}
          sx={{ mt: 2, justifyContent: "flex-end" }}
        >
          Clear Selection
        </Button>
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
