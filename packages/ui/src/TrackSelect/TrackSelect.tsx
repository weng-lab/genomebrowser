import { 
  ExtendedTreeItemProps, 
  SearchTracksProps, 
  CustomTreeItemProps, 
  RowInfo,
  SelectionState,
  SelectionAction
} from "./types";
import { assayTypes, ontologyTypes, rows, columns } from "./consts";
import { 
  searchTracks, 
  getTracksByAssayAndOntology, 
  flattenIntoRow, 
} from "./dataGridHelpers";
import { 
  Box, 
  Typography,
  Switch, 
  FormControlLabel, 
  Stack, 
  TextField, 
  Button, 
  Paper
} from "@mui/material";
import React, { useMemo, useState } from "react";
import { create } from 'zustand';
import { TreeViewWrapper } from "./TreeViewWrapper";
import { DataGridWrapper, } from "./DataGridWrapper";

// some attempted configurations:
// 1. keeping track of only selectedIds in store and looking up row information through selectedIds and rowById in buildTreeView() 
// 2. keeping track of both selectedIds and selectedRows but having the same setters for them
// 3. removing store altogether and just trying to keep track of selectedIds through simple array and looking up row information through rowIds
//    -> doesn't remove items from treeview properly, the item that you try to remove just keeps being added back specifically when you add all of the 
//    items in a grouping--but it keeps track of state when you toggle between views

// 4. keeping track of both selectedIds and selectedRows in store and having separate setters for each of them
//    -> removes items successfully except for when you try to remove assay folder level on sorted assay view, 
//    but doesn't keep track of selected states properly when you toggle between sorting methods 
//    (ie when you remove something on one view, it comes back when u toggle to another view)

const useSelectionStore = create<SelectionState & SelectionAction>((set) => ({
    selectedIds: new Set<string>(),
    setSelected: (ids: Set<string>) => set(() => ({
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
  const selectedIds = useSelectionStore((s) => (s.selectedIds));
  const setSelected = useSelectionStore((s) => s.setSelected);
  const remove = useSelectionStore((s) => s.remove);

  console.log("trackSelect selectedIds: ", selectedIds)
  // const [sortedAssay, setSortedAssay] = useState(false);
  // const [filteredRows, setFilteredRows] = useState(rows);
  // const handleToggle = () => {
  //   setSortedAssay(!sortedAssay);
  // };
  // const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.value === "") {
  //     setFilteredRows(rows);
  //     return;
  //   }
  //   const props: SearchTracksProps = {
  //     jsonStructure: "tracks",
  //     query: e.target.value,
  //     keyWeightMap: [
  //       "displayname",
  //       "ontology",
  //       "lifeStage",
  //       "sampleType",
  //       "type",
  //       "experimentAccession",
  //       "fileAccession",
  //     ],
  //     limit: 50,
  //   };
  //   const res = searchTracks(props);
  //   setFilteredRows(res.map(flattenIntoRow));
  // };
  return (
    <Box width="fit-content">
      {/* <Box display="flex" justifyContent="space-between" sx={{ mb: 3 }}>
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
      </Box> */}
      <Stack direction="row" spacing={2}>
        <DataGridWrapper selectedIds={selectedIds} setSelected={setSelected}/>
        <TreeViewWrapper selectedIds={selectedIds} remove={remove}/>
      </Stack>
      {/* <Box sx={{ justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => clear()}
            sx={{ mt: 2, justifyContent: "flex-end" }}
          >
            Clear Selection
          </Button>
      </Box> */}
    </Box>
  );
}
