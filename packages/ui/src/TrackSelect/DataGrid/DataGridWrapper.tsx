import { Box, Paper, Stack } from "@mui/material";
import {
  DataGridPremium,
  GridToolbarProps,
  ToolbarPropsOverrides,
  GridRowSelectionModel,
  GridAutosizeOptions,
  useGridApiRef,
  GridColDef,
  FilterColumnsArgs
} from "@mui/x-data-grid-premium";
import { RowInfo } from "../types";
import { DataGridProps } from "./types";
import { CustomToolbar } from "./CustomToolbar";
import { useEffect, useMemo } from "react";
import { AssayIcon } from "../TreeView/treeViewHelpers";

const autosizeOptions: GridAutosizeOptions = {
  expand: true,
  includeHeaders: true,
  outliersFactor: 1.5,
};

// TODO figure out where mui stores the number of rows in a row grouping so that can be bolded too
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
    setActive,
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

  const apiRef = useGridApiRef();
  const groupingModel = sortedAssay ? ["assay", "ontology"] : ["ontology", "assay"];
  const columnModel = sortedAssay ? sortedByAssayColumns : columns;

  // functions to customize the column and filter panel in the toolbar 
  const filterColumns = ({ columns }: FilterColumnsArgs) => {
    return columns.filter((column) => column.type !== 'custom').map((column) => column.field);
  };

  const getTogglableColumns = (columns: GridColDef[]) => {
    return columns.filter((column) => column.type !== 'custom').map((column) => column.field);
  };

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
    setActive();
  };

  return (
    <Paper sx={{ width: "100%" }}>
      <Box sx={{
        height: 500,
        width: "100%",
        overflow: "auto",
      }}>
        <DataGridPremium
          apiRef={apiRef}
          rows={rows}
          columns={columnModel}
          getRowId={(row) => row.experimentAccession}
          autosizeOptions={autosizeOptions}
          rowGroupingModel={groupingModel}
          groupingColDef={{ leafField: "displayname", display: "flex" }}
          columnVisibilityModel={{ displayname: false }} // so you don't see a second name column
          onRowSelectionModelChange={handleSelection}
          rowSelectionPropagation={{ descendants: true }}
          rowSelectionModel={{ type: "include", ids: new Set(selectedIds) }}
          slots={{
            toolbar: CustomToolbarWrapper,
          }}
          slotProps={{
            filterPanel: {
              filterFormProps: {
                filterColumns,
              },
            },
            columnsManagement: {
              getTogglableColumns,
            },
          }}
          sx={{ ml: 2, display: "flex" }}
          keepNonExistentRowsSelected
          showToolbar
          disableAggregation
          disableRowSelectionExcludeModel
          disablePivoting
          checkboxSelection
          autosizeOnMount
          pagination
        />
      </Box>
    </Paper>
  );
}
