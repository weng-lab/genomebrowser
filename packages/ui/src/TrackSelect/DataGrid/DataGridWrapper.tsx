import { Box, Paper, Typography, Stack } from "@mui/material";
import {
  DataGridPremium,
  GridRowSelectionModel,
  GridAutosizeOptions,
  useGridApiRef,
  GridColDef
} from "@mui/x-data-grid-premium";
import { rows } from "../consts";
import { DataGridWrapperProps, RowInfo } from "../types";
import { useEffect } from "react";
import { AssayIcon } from "../TreeView/treeViewHelpers";

const autosizeOptions: GridAutosizeOptions = {
  expand: true,
  includeHeaders: true,
  outliersFactor: 1.5,
};

// TODO figure out where mui stores the number of rows in a row grouping so i can bold that too
const sortedByAssayColumns: GridColDef<RowInfo>[] = [
  { field: "displayname", headerName: "Name" },
  { field: "ontology", headerName: "Ontology" },
  { field: "lifeStage", headerName: "Life Stage" },
  { field: "sampleType", headerName: "Sample Type" },
  { field: "assay", 
    headerName: "Assay", 
    renderCell: (params) => {
      if (params.rowNode.type === 'group') {
        if (params.value === undefined) {
          return null;
        }
        const val = params.value;
        return (
          <Stack direction="row" spacing={2} alignItems="center">
            {AssayIcon(val)}
            <div><b>{val}</b></div>
          </Stack>
        )
      }
    }
  },
  { field: "experimentAccession", headerName: "Experiment Accession" },
  { field: "fileAccession", headerName: "File Accession" },
];

const columns: GridColDef<RowInfo>[] = [
  { field: "displayname", headerName: "Name" },
  { field: "ontology", 
    headerName: "Ontology",
    renderCell: (params) => {
      if (params.rowNode.type === 'group') {
        if (params.value === undefined) {
          return null;
        }
        const val = params.value;
        console.log(val)
        return (
          <div><b>{val}</b></div>
        )
      }
    }
  },
  { field: "lifeStage", headerName: "Life Stage" },
  { field: "sampleType", headerName: "Sample Type" },
  { field: "assay", 
    headerName: "Assay",
    renderCell: (params) => {
      if (params.rowNode.type === 'group') {
        if (params.value === undefined) {
          return null;
        }
        const val = params.value;
        return (
          <Stack direction="row" spacing={2} alignItems="center">
            {AssayIcon(val)}
            <div>{val}</div>
          </Stack>
        )
      }
    }
   },
  { field: "experimentAccession", headerName: "Experiment Accession" },
  { field: "fileAccession", headerName: "File Accession" },
];

export function DataGridWrapper({
  filteredRows,
  selectedIds,
  setSelected,
  sortedAssay
}: DataGridWrapperProps) {
  const groupingModel = sortedAssay ? ["assay", "ontology"] : ["ontology", "assay"];

  const apiRef = useGridApiRef();

  const handleResizeCols = () => {
    // need to check .autosizeColumns since the current was being set with an empty object
    if (!apiRef.current?.autosizeColumns) return;
    apiRef.current.autosizeColumns(autosizeOptions);
  };

  // trigger resize when rows or columns change so that rows/columns don't need to be memoized outisde of this component
  // otherwise sometimes would snap back to default widths when rows/columns change
  useEffect(() => {
    handleResizeCols();
  }, [rows, columns, sortedByAssayColumns, handleResizeCols]);

  const handleSelection = (newSelection: GridRowSelectionModel) => {
    const idsSet = (newSelection && (newSelection as any).ids) ?? new Set<string>();
    setSelected(idsSet);
  };

  return (
    <Paper>
      <Box sx={{ height: "500px", width: "1000px", overflow: "auto" }}>
        <Typography>
          <Box sx={{ fontWeight: "bold", padding: 2 }}>
            {rows.length} available tracks
          </Box>
        </Typography>
        <DataGridPremium
          rows={filteredRows}
          columns={sortedAssay ? sortedByAssayColumns : columns}
          getRowId={(row) => row.experimentAccession}
          autosizeOptions={autosizeOptions}
          rowGroupingModel={groupingModel}
          groupingColDef={{ leafField: "displayname", display: "flex" }}
          columnVisibilityModel={{ displayname: false }} // so you don't see a second name column
          onRowSelectionModelChange={handleSelection}
          rowSelectionModel={{ type: "include", ids: new Set(selectedIds) }}
          sx={{ ml: 2, display: "flex" }}
          showToolbar
          disableAggregation
          disablePivoting
          checkboxSelection
          autosizeOnMount
          pagination
        />
      </Box>
    </Paper>
  );
}
