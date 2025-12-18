import { Box, Stack, TextField, FormControlLabel, Switch, Button } from "@mui/material";
import { create } from "zustand";
import { DataGridWrapper } from "./DataGrid/DataGridWrapper";
import { searchTracks, flattenIntoRow } from "./DataGrid/dataGridHelpers";
import { TreeViewWrapper } from "./TreeView/TreeViewWrapper";
import { buildSortedAssayTreeView, buildTreeView, searchTreeItems } from "./TreeView/treeViewHelpers";
import { SelectionAction, SelectionState, SearchTracksProps, ExtendedTreeItemProps } from "./types";
import { rows, rowById } from "./consts";
import React, { useState, useMemo, useEffect } from "react";
import { TreeViewBaseItem } from "@mui/x-tree-view";

const useSelectionStore = create<SelectionState & SelectionAction>((set) => ({
  selectedIds: new Set<string>(),
  setSelected: (ids: Set<string>) =>
    set(() => ({
      selectedIds: new Set(ids),
    })),
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
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const setSelected = useSelectionStore((s) => s.setSelected);
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
    }
  }, [treeItems, searchQuery]);

  const handleToggle = () => {
    setSortedAssay(!sortedAssay);
  };
  console.log(treeItems);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);

    const props: SearchTracksProps = {
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
      limit: 50,
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
      limit: 50,
    }
    const newDataGridRows = searchTracks(props)
      .map(t => t.item)
      .map(flattenIntoRow);

    // we only want the intersection of filtered tracks displayed on the DataGrid and user-selected tracks to be displayed on the tree
    const newDataGridIds = newDataGridRows.map(r => r.experimentAccession);
    const retIds = searchTreeItems(treeSearchProps)
      .map(r => r.item.experimentAccession);
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
    setFilteredTreeItems(newTreeItems);
  };

  return (
    <Box width="fit-content">
      <Box display="flex" justifyContent="space-between" sx={{ mb: 3 }}>
        <TextField
          id="outlined-suffix-shrink"
          label="Search"
          variant="outlined"
          onChange={handleSearch}
          sx={{ width: "250px" }}
        />
        <FormControlLabel
          sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}
          value="Sort by assay"
          control={<Switch color="primary" onChange={handleToggle} />}
          label="Sort by assay"
          labelPlacement="end"
        />
      </Box>
      <Stack direction="row" spacing={2}>
        <DataGridWrapper 
          rows={filteredRows}
          label={`${selectedIds.size} Available Tracks`}
          selectedIds={selectedIds}
          setSelected={setSelected}
          sortedAssay={sortedAssay}
        />
        <TreeViewWrapper items={filteredTreeItems} selectedIds={selectedIds} remove={remove}/>
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