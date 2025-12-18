import { Box, Stack, TextField, FormControlLabel, Switch, Button } from "@mui/material";
import { create } from "zustand";
import { DataGridWrapper } from "./DataGrid/DataGridWrapper";
import { searchTracks, flattenIntoRow } from "./DataGrid/dataGridHelpers";
import { TreeViewWrapper } from "./TreeView/TreeViewWrapper";
import { buildSortedAssayTreeView, buildTreeView, searchTreeItems } from "./TreeView/treeViewHelpers";
import { 
  SelectionAction, 
  SelectionState, 
  SearchTracksProps, 
  ExtendedTreeItemProps 
} from "./types";
import { rows, rowById } from "./consts";
import React, { useState, useMemo, useEffect } from "react";
import { TreeViewBaseItem } from "@mui/x-tree-view";

const useSelectionStore = create<SelectionState & SelectionAction>((set) => ({
  selectedIds: new Set<string>(),
  activeTracks: new Set<string>(),
  setSelected: (ids: Set<string>) =>
    set(() => ({
      selectedIds: new Set(ids),
    })),
  setActive: () => set((state) => ({ activeTracks: new Set(Array.from(state.selectedIds).filter(i => i[0] === "E"))})),
  remove: (removedIds: Set<string>) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      removedIds.forEach((id) => {
        next.delete(id);
      });
      return { selectedIds: next };
    }),
  clear: () => set(() => ({ selectedIds: new Set<string>() })),
}));

export default function TrackSelect() {
  const [sortedAssay, setSortedAssay] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchResult, setIsSearchResult] = useState(false);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const activeTracks = useSelectionStore((s) => s.activeTracks);
  const setSelected = useSelectionStore((s) => s.setSelected);
  const setActive = useSelectionStore((s) => s.setActive);
  const remove = useSelectionStore((s) => s.remove);
  const clear = useSelectionStore((s) => s.clear);

  const treeItems = useMemo(() => {
      return sortedAssay ? buildSortedAssayTreeView(Array.from(selectedIds), 
      {
        id: "1",
        isAssayItem: false,
        label: "Biosamples",
        icon: "folder",
        children: [],
        allRowInfo: []
      }, rowById) : 
      buildTreeView(Array.from(selectedIds), {
        id: "1",
        isAssayItem: false,
        label: "Biosamples",
        icon: "folder",
        children: [],
        allRowInfo: []
      }, rowById); // TODO: refactor these to put into one function
  }, [selectedIds, sortedAssay]);

  const [filteredRows, setFilteredRows] = useState(rows);
  const [filteredTreeItems, setFilteredTreeItems] = useState([{
        id: "1",
        isAssayItem: false,
        label: "Biosamples",
        icon: "folder",
        children: [],
        allRowInfo: []
      }] as TreeViewBaseItem<ExtendedTreeItemProps>[]);

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
    }
    const newDataGridRows = searchTracks(dataGridSearchProps)
      .map(t => t.item)
      .map(flattenIntoRow);

    // we only want the intersection of filtered tracks displayed on the DataGrid and user-selected tracks to be displayed on the tree
    const newDataGridIds = newDataGridRows.map(r => r.experimentAccession);
    const retIds = searchTreeItems(treeSearchProps).map(r => r.item.experimentAccession);
    const newTreeIds = retIds.filter(i => newDataGridIds.includes(i));
    const newTreeItems = sortedAssay ? buildSortedAssayTreeView(newTreeIds, {
        id: "1",
        isAssayItem: false,
        label: "Biosamples",
        icon: "folder",
        children: [],
        allRowInfo: []
      }, rowById) : buildTreeView(newTreeIds, {
        id: "1",
        isAssayItem: false,
        label: "Biosamples",
        icon: "folder",
        children: [],
        allRowInfo: []
      }, rowById);

    setFilteredRows(newDataGridRows);
    setIsSearchResult(true);
    setFilteredTreeItems(newTreeItems);
  };

  console.log(selectedIds);

  return (
    <Box sx={{ flex: 1 }}>
      <Box display="flex" justifyContent="space-between" sx={{ mb: 3 }}>
        <TextField
          id="outlined-suffix-shrink"
          label="Search"
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
      <Stack direction="row" spacing={2} sx={{ width: "100%"}}>
        <Box sx={{ flex: 3, minWidth: 0 }}>
          <DataGridWrapper 
            rows={filteredRows}
            label={isSearchResult ? `${filteredRows.length} Search Results` : `${rows.length} Available Tracks`}
            selectedIds={selectedIds}
            setSelected={setSelected}
            setActive={setActive}
            sortedAssay={sortedAssay}
          />
        </Box>
        <Box sx={{ flex: 2, minWidth: 0 }}>
          <TreeViewWrapper 
            items={filteredTreeItems} 
            selectedIds={selectedIds} 
            activeTracks={activeTracks} 
            remove={remove}
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
    </Box>
  );
}