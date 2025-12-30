import { Box, Paper } from "@mui/material";
import {
  DataGridPremium,
  FilterColumnsArgs,
  GridAutosizeOptions,
  GridColDef,
  GridColumnVisibilityModel,
  useGridApiRef,
} from "@mui/x-data-grid-premium";
import { useEffect, useState } from "react";
import { DataGridProps } from "../types";
import { defaultColumns, sortedByAssayColumns } from "./columns";

const autosizeOptions: GridAutosizeOptions = {
  expand: true,
  includeHeaders: true,
  outliersFactor: 1.5,
};

// TODO: figure out where mui stores the number of rows in a row grouping so that can be bolded too
export function DataGridWrapper(props: DataGridProps) {
  const { sortedAssay, handleSelection, rows, selectedIds } = props;

  const apiRef = useGridApiRef();

  // Resize columns when toggling between sort modes
  useEffect(() => {
    if (apiRef.current && apiRef.current.autosizeColumns) {
      apiRef.current.autosizeColumns(autosizeOptions);
    }
  }, [sortedAssay]);

  const groupingModel = sortedAssay
    ? ["assay", "ontology"]
    : ["ontology", "displayname"];
  const columnModel = sortedAssay ? sortedByAssayColumns : defaultColumns;
  const leafField = sortedAssay ? "displayname" : "assay";

  // Hide columns that are used in grouping or as leaf field
  const baseVisibility: GridColumnVisibilityModel = sortedAssay
    ? { assay: false, ontology: false, displayname: false } // sort by assay: assay & ontology are grouping, displayname is leaf
    : { ontology: false, displayname: false, assay: false }; // default: ontology & displayname are grouping, assay is leaf

  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>(baseVisibility);

  // Update visibility when sort mode changes
  useEffect(() => {
    setColumnVisibilityModel(baseVisibility);
  }, [sortedAssay]);

  // functions to customize the column and filter panel in the toolbar
  const filterColumns = ({ columns }: FilterColumnsArgs) => {
    return columns
      .filter((column) => column.type !== "custom")
      .map((column) => column.field);
  };

  const getTogglableColumns = (columns: GridColDef[]) => {
    return columns
      .filter((column) => column.type !== "custom")
      .map((column) => column.field);
  };

  return (
    <Paper sx={{ width: "100%" }}>
      <Box
        sx={{
          height: 500,
          width: "100%",
          overflow: "auto",
        }}
      >
        <DataGridPremium
          apiRef={apiRef}
          rows={rows}
          columns={columnModel}
          getRowId={(row) => row.experimentAccession}
          autosizeOptions={autosizeOptions}
          rowGroupingModel={groupingModel}
          groupingColDef={{ leafField, display: "flex" }}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={setColumnVisibilityModel}
          onRowSelectionModelChange={handleSelection}
          rowSelectionPropagation={{ descendants: true, parents: true }}
          disableRowGrouping={false}
          rowSelectionModel={{
            type: "include",
            ids: selectedIds,
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
          keepNonExistentRowsSelected
          showToolbar
          disableAggregation
          disableRowSelectionExcludeModel
          disablePivoting
          checkboxSelection
          autosizeOnMount
          pagination
          hideFooterSelectedRowCount
        />
      </Box>
    </Paper>
  );
}
