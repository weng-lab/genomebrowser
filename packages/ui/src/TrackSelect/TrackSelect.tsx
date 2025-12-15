import { 
  ExtendedTreeItemProps, 
  SearchTracksProps, 
  CustomTreeItemProps, 
  RowInfo,
} from "./types";
import { assayTypes, ontologyTypes } from "./consts";
import { buildSortedAssayTreeView, buildTreeView, CustomTreeItem } from "./treeViewHelpers";
import { 
  searchTracks, 
  getTracksByAssayAndOntology, 
  flattenIntoRow, 
  useSelectionStore
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

export default function TrackSelect() {
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

  const [sortedAssay, setSortedAssay] = useState(false);
  const [filteredRows, setFilteredRows] = useState(rows);
  const selectedRows = useSelectionStore((s) => s.selectedRows);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const setSelectedRows = useSelectionStore((s) => s.setSelectedRows);
  const setSelectedIds = useSelectionStore((s) => s.setSelectedIds);
  const removeSelectedRowsByIds = useSelectionStore((s) => s.removeRows);
  const clearSelectedRows = useSelectionStore((s) => s.clear);

  const treeItems = useMemo(() => {
    return sortedAssay ? 
    buildSortedAssayTreeView(
      selectedRows,
      { id: "1", label: "Biosamples", icon: "folder", children: [] },
    ) : 
    buildTreeView(
      selectedRows,
      { id: "1", label: "Biosamples", icon: "folder", children: [] },
    );
  }, [selectedRows, sortedAssay]);
  
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
    const idsArray = Array.from(idsSet);
    const newSelectedRows: RowInfo[] = idsArray
      .map((id) => rows.find((r: any) => r.experimentAccession === id))
      .filter(Boolean) as RowInfo[];
    setSelectedRows(newSelectedRows);
    setSelectedIds(idsArray as string[]);
  };

  const handleRemoveTreeItem = (item: TreeViewBaseItem<ExtendedTreeItemProps>) => {
    const removedIds = item.allExpAccessions;
    if (removedIds && removedIds.length) {
      removeSelectedRowsByIds(removedIds);
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
              rowSelectionModel={{ type: "include", ids: selectedIds }}
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
            onClick={() => clearSelectedRows()}
            sx={{ mt: 2, justifyContent: "flex-end" }}
          >
            Clear Selection
          </Button>

      </Box>
    </Box>
  );
}
