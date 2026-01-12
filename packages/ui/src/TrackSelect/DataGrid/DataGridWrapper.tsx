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
import GroupingCell from "./GroupingCell";

const autosizeOptions: GridAutosizeOptions = {
  expand: true,
  includeHeaders: true,
  outliersFactor: 1.5,
};

export function DataGridWrapper(props: DataGridProps) {
  const { groupingMode, handleSelection, rows, selectedIds } = props;

  const apiRef = useGridApiRef();

  // Resize columns when toggling between grouping modes
  useEffect(() => {
    if (apiRef.current && apiRef.current.autosizeColumns) {
      apiRef.current.autosizeColumns(autosizeOptions);
    }
  }, [groupingMode.id]);

  const groupingModel = groupingMode.dataGridGrouping;
  const columnModel = groupingMode.columns;
  const leafField = groupingMode.leafField;

  // Hide columns that are used in grouping or as leaf field, plus ID column
  const baseVisibility: GridColumnVisibilityModel = {
    id: false,
    ...Object.fromEntries(
      groupingMode.dataGridGrouping.map((field) => [field, false])
    ),
    [leafField]: false,
  };

  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>(baseVisibility);

  // Update visibility when grouping mode changes
  useEffect(() => {
    setColumnVisibilityModel(baseVisibility);
  }, [groupingMode.id]);

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
          getRowId={(row) => row.id}
          autosizeOptions={autosizeOptions}
          rowGroupingModel={groupingModel}
          groupingColDef={{
            leafField,
            display: "flex",
            minWidth: 300,
            maxWidth: 500,
            flex: 2,
            renderCell: (params) => <GroupingCell {...params} />,
          }}
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
