import { 
  ExtendedTreeItemProps, 
  SearchTracksProps, 
  CustomTreeItemProps, 
  RowInfo,
  SelectionState,
  SelectionAction
} from "./types";
import { assayTypes, ontologyTypes } from "./consts";
import { buildSortedAssayTreeView, buildTreeView, CustomTreeItem } from "./treeViewHelpers";
import { 
  searchTracks, 
  getTracksByAssayAndOntology, 
  flattenIntoRow, 
} from "./dataGridHelpers";
import { RichTreeView } from "@mui/x-tree-view/RichTreeView";
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
import {
  DataGridPremium,
  GridRowSelectionModel,
  GridColDef
} from "@mui/x-data-grid-premium";
import { TreeViewBaseItem } from "@mui/x-tree-view";
import React, { useMemo, useState } from "react";
import { create } from 'zustand';

// some attempted configurations:
// 1. keeping track of only selectedIds in store and looking up row information through selectedIds and rowById in buildTreeView() 
// 2. keeping track of both selectedIds and selectedRows but having the same setters for them
// 3. removing store altogether and just trying to keep track of selectedIds through simple array and looking up row information through rowIds
//    -> doesn't remove items from treeview properly, the item that you try to remove just keeps being added back 

// 4. keeping track of both selectedIds and selectedRows in store and having separate setters for each of them
//    -> removes items successfully except for when you try to remove assay folder level on sorted assay view, 
//    but doesn't keep track of selected states properly when you toggle between sorting methods 
//    (ie when you remove something on one view, it comes back when u toggle to another view)

const useSelectionStore = create<SelectionState & SelectionAction>((set) => ({
  selectedIds: [],
  setSelected: (ids: string[]) => set(() => ({ selectedIds: ids })),
  add: (newIds: string[]) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      for (const id of newIds) next.add(id);
      return { selectedIds: Array.from(next) };
    }),
  remove: (ids: string[]) =>
    set((state) => {
      const toRemoveIds: Set<string> = new Set(ids);
      return {
        selectedIds: state.selectedIds.filter(
          (s: any) => !toRemoveIds.has(s),
        )
      };
    }),
  clear: () => set(() => ({ selectedIds: [] })),
}));

const rows = ontologyTypes.flatMap((ontology) =>
  assayTypes.flatMap((assay) =>
    getTracksByAssayAndOntology(
      assay.toLowerCase(),
      ontology.toLowerCase(),
    ).map((r) => {
      const flat = flattenIntoRow(r);
      return {
        ...flat,
        assay,
        ontology,
      };
    }),
  ),
);

export default function TrackSelect() {
  // map of experimentAccession: rowInfo for faster row lookup
  const rowById = useMemo(() => {
    const m = new Map<string, RowInfo>();
    for (const r of rows) m.set(r.experimentAccession, r);
    return m;
  }, [rows]);

  const [sortedAssay, setSortedAssay] = useState(false);
  const [filteredRows, setFilteredRows] = useState(rows);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const setSelected = useSelectionStore((s) => s.setSelected);
  const clear = useSelectionStore((s) => s.clear);
  const remove = useSelectionStore((s) => s.remove)

  const treeItems = useMemo(() => {
    return sortedAssay ? buildSortedAssayTreeView(selectedIds, rowById) : buildTreeView(selectedIds, rowById); // TODO: refactor these to put into one function
  }, [selectedIds, sortedAssay, rowById]);
  
  const handleToggle = () => {
    setSortedAssay(!sortedAssay);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === "") {
      setFilteredRows(rows);
      return;
    }
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
    const res = searchTracks(props);
    setFilteredRows(res.map(flattenIntoRow));
  };

  const handleSelection = (newSelection: GridRowSelectionModel) => {
    const idsSet = (newSelection && (newSelection as any).ids) ?? new Set<string>();
    const idsArray: string[] = Array.from(idsSet);
    setSelected(idsArray)
  };

  const handleRemoveTreeItem = (item: TreeViewBaseItem<ExtendedTreeItemProps>) => {
    const removedIds = item.allExpAccessions;
    if (removedIds && removedIds.length) {
      remove(removedIds);
    }
  };

  const columns: GridColDef[] = [
    { field: "displayname", headerName: "Name" },
    { field: "ontology", headerName: "Ontology" },
    { field: "lifeStage", headerName: "Life Stage" },
    { field: "sampleType", headerName: "Sample Type" },
    { field: "assay", headerName: "Assay" },
    { field: "experimentAccession", headerName: "Experiment Accession" },
    { field: "fileAccession", headerName: "File Accession" },
  ];

  const groupingModel = sortedAssay
    ? ["assay", "ontology"]
    : ["ontology", "assay"];

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
        <Paper>
          <Box sx={{ height: "500px", width: "1000px", overflow: "auto" }}>
            <Typography>
              <Box sx={{ fontWeight: "bold", padding: 2 }}>
                {rows.length} available tracks
              </Box>
            </Typography>
            <DataGridPremium
              rows={filteredRows}
              columns={columns}
              getRowId={(row) => row.experimentAccession}
              rowGroupingModel={groupingModel}
              groupingColDef={{ leafField: "displayname", display: "flex" }}
              columnVisibilityModel={{ displayname: false }}
              onRowSelectionModelChange={handleSelection}
              rowSelectionModel={{ type: "include", ids: new Set<string>(selectedIds) }} // making a new Set here instead of store avoids making infinite calls
              sx={{ ml: 2, display: "flex" }}
              checkboxSelection
              autosizeOnMount
              pagination
            />
          </Box>
        </Paper>
        <Paper>
          <Box sx={{ width: "500px", height: "500px", overflow: "auto" }}>
            <Typography>
              <Box sx={{ fontWeight: "bold", padding: 2 }}>Active Tracks</Box>
            </Typography>
              <RichTreeView
                items={treeItems}
                defaultExpandedItems={['1']}
                slots={{ item: CustomTreeItem  }}
                slotProps = {{ 
                  item: { 
                    onRemove: handleRemoveTreeItem 
                  } as Partial<CustomTreeItemProps> // avoiding the slotProps typing error
                }}
                sx={{
                  ml: 1,
                  mr: 1,
                  height: "fit-content",
                  flexGrow: 1,
                  overflowY: "auto",
                }}
                itemChildrenIndentation={0}
              />
          </Box>
        </Paper>
      </Stack>
      <Box sx={{ justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => clear()}
            sx={{ mt: 2, justifyContent: "flex-end" }}
          >
            Clear Selection
          </Button>

      </Box>
    </Box>
  );
}
