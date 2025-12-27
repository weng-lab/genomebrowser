import { Box, Paper } from "@mui/material";
import {
  DataGridPremium,
  FilterColumnsArgs,
  GridAutosizeOptions,
  GridColDef,
  GridColumnVisibilityModel,
} from "@mui/x-data-grid-premium";
import { useState } from "react";
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

  const groupingModel = sortedAssay
    ? ["assay", "ontology"]
    : ["ontology", "displayname"];
  const columnModel = sortedAssay ? sortedByAssayColumns : defaultColumns;

  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({
      assay: false,
      displayname: false,
    });

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
          rows={rows}
          columns={columnModel}
          getRowId={(row) => row.experimentAccession}
          autosizeOptions={autosizeOptions}
          rowGroupingModel={groupingModel}
          groupingColDef={{ leafField: "assay", display: "flex" }}
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
