import { Box, Paper, Stack } from "@mui/material";
import {
  DataGridPremium,
  GridToolbarProps,
  ToolbarPropsOverrides,
  GridRowSelectionModel,
  GridAutosizeOptions,
  useGridApiRef,
  GridColDef
} from "@mui/x-data-grid-premium";
import { RowInfo } from "../types";
import { DataGridProps } from "./types";
import { CustomToolbar } from "./CustomToolBar";
import { useEffect, useMemo } from "react";
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

export function DataGridWrapper(props: DataGridProps) {
  const {
    label,
    labelTooltip,
    downloadFileName,
    toolbarSlot,
    toolbarStyle,
    toolbarIconColor,
    sortedAssay,
    setSelected,
    rows,
    selectedIds
  } = props;

  const CustomToolbarWrapper = useMemo(() => {
    const customToolbarProps = {
      label,
      downloadFileName,
      labelTooltip,
      toolbarSlot,
      toolbarStyle,
      toolbarIconColor,
    };
    return (props: GridToolbarProps & ToolbarPropsOverrides) => <CustomToolbar {...props} {...customToolbarProps} />;
  }, [label, labelTooltip, toolbarSlot]);

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
        <DataGridPremium
          rows={rows}
          columns={columns}
          getRowId={(row) => row.experimentAccession}
          autosizeOptions={autosizeOptions}
          rowGroupingModel={groupingModel}
          groupingColDef={{ leafField: "displayname", display: "flex" }}
          columnVisibilityModel={{ displayname: false }} // so you don't see a second name column
          onRowSelectionModelChange={handleSelection}
          rowSelectionModel={{ type: "include", ids: new Set(selectedIds) }}
          slots={{
            toolbar: CustomToolbarWrapper,
          }}
          sx={{ ml: 2, display: "flex" }}
          keepNonExistentRowsSelected
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
