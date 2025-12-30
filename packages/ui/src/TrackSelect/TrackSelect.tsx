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
import React, { useEffect, useMemo, useRef, useState } from "react";
import { DataGridWrapper } from "./DataGrid/DataGridWrapper";
import { flattenIntoRows, searchTracks } from "./DataGrid/dataGridHelpers";
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
      const matchingTrackIds = Array.from(trackIds).filter((id) =>
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
  }, [treeItems, searchQuery, trackIds, sortedAssay]);

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

      const dataGridSearchProps: SearchTracksProps = {
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
      const retIds = searchTreeItems(treeSearchProps).map(
        (r) => r.item.id,
      );
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

    // Store ALL IDs (including auto-generated group IDs)
    setSelected(allIds);
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
