import { Box, Paper } from "@mui/material";
import {
  DataGridPremium,
  FilterColumnsArgs,
  GridAutosizeOptions,
  GridColDef,
  GridColumnVisibilityModel,
  useGridApiRef,
} from "@mui/x-data-grid-premium";
import { useEffect, useMemo, useState } from "react";
import { DataGridProps } from "../types";
import { DefaultGroupingCell } from "./DefaultGroupingCell";

const autosizeOptions: GridAutosizeOptions = {
  expand: true,
  includeHeaders: true,
  outliersFactor: 1.5,
};

export function DataGridWrapper(props: DataGridProps) {
  const {
    columns,
    groupingModel,
    leafField,
    onSelectionChange,
    rows,
    selectedIds,
    GroupingCellComponent,
  } = props;

  const GroupingCell = GroupingCellComponent ?? DefaultGroupingCell;

  const apiRef = useGridApiRef();

  useEffect(() => {
    if (apiRef.current && apiRef.current.autosizeColumns) {
      apiRef.current.autosizeColumns(autosizeOptions);
    }
  }, [columns, groupingModel, leafField]);

  const baseVisibility = useMemo(() => {
    const visibility: GridColumnVisibilityModel = {
      id: false,
    };

    // Only hide leafField if we have grouping (it shows in grouping column)
    if (groupingModel.length > 0) {
      visibility[leafField] = false;
    }

    groupingModel.forEach((field) => {
      visibility[field] = false;
    });

    return visibility;
  }, [groupingModel, leafField]);

  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>(baseVisibility);

  useEffect(() => {
    setColumnVisibilityModel(baseVisibility);
  }, [baseVisibility]);

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
          columns={columns}
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
          onRowSelectionModelChange={(selection) => {
            const ids = (selection as any)?.ids ?? new Set<string>();
            onSelectionChange(new Set(ids));
          }}
          rowSelectionPropagation={{ descendants: true, parents: false }}
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
