import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import {
  DataGridPremium,
  type GridColDef,
  type GridColumnVisibilityModel,
} from "@mui/x-data-grid-premium";
import { useMemo, useState } from "react";
import { getCatalogRows, getCatalogTrackIds, type CatalogGridRow } from "../catalog/catalogRows";
import { trackSelectPanelHeight } from "../trackSelectConstants";
import { TrackSelectEmptyPanel } from "../trackSelectEmptyPanel";
import type {
  TrackSelectColumn,
  TrackSelectCatalog,
  TrackSelectView,
} from "../schema/catalogSchema";

type CatalogGridProps = {
  catalog: TrackSelectCatalog | undefined;
  view: TrackSelectView | undefined;
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
};

type CatalogDataGridProps = {
  catalog: TrackSelectCatalog;
  view: TrackSelectView;
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
};

const builtInLabels: Record<string, string> = {
  id: "ID",
  title: "Title",
  type: "Type",
};

export function CatalogGrid({ catalog, view, selectedIds, onSelectionChange }: CatalogGridProps) {
  if (!catalog || !view) {
    return <TrackSelectEmptyPanel>No track catalog selected.</TrackSelectEmptyPanel>;
  }

  return (
    <CatalogDataGrid
      key={`${catalog.id}:${view.id}`}
      catalog={catalog}
      view={view}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
    />
  );
}

function CatalogDataGrid({ catalog, view, selectedIds, onSelectionChange }: CatalogDataGridProps) {
  const rows = useMemo(() => getCatalogRows(catalog), [catalog]);
  const validLeafIds = useMemo(() => getCatalogTrackIds(catalog), [catalog]);
  const columns = useMemo(() => getColumns(view), [view]);
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>(
    () => getColumnVisibilityModel(view),
  );

  return (
    <Paper sx={{ width: "100%" }}>
      <Box sx={{ height: trackSelectPanelHeight, width: "100%", overflow: "auto" }}>
        <DataGridPremium
          rows={rows}
          columns={columns}
          getRowId={getRowId}
          rowGroupingModel={view.grouping}
          groupingColDef={{
            leafField: view.leaf,
            display: "flex",
            minWidth: 300,
            maxWidth: 500,
            flex: 2,
            cellClassName: (params) =>
              params.rowNode.type === "group" ? "track-select-group-title" : "",
          }}
          sx={{
            "& .track-select-group-title": {
              fontWeight: "bold",
            },
          }}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={setColumnVisibilityModel}
          onRowSelectionModelChange={(selection) => {
            // MUI exposes the selected IDs as a Set, but the generic event type
            // does not preserve that shape here.
            const emittedIds = (selection as { ids?: Set<unknown> }).ids ?? new Set();
            const nextSelectedIds = new Set<string>();
            for (const id of emittedIds) {
              if (typeof id === "string" && validLeafIds.has(id)) {
                nextSelectedIds.add(id);
              }
            }
            onSelectionChange(nextSelectedIds);
          }}
          rowSelectionModel={{ type: "include", ids: selectedIds }}
          rowSelectionPropagation={{ descendants: true, parents: false }}
          keepNonExistentRowsSelected
          showToolbar
          checkboxSelection
          disableAggregation
          disablePivoting
          disableRowSelectionExcludeModel
          hideFooterSelectedRowCount
          pagination
        />
      </Box>
    </Paper>
  );
}

function getRowId(row: CatalogGridRow) {
  return row.id;
}

function getColumns(view: TrackSelectView): GridColDef<CatalogGridRow>[] {
  const viewColumnsByField = new Map(view.columns.map((column) => [column.field, column]));
  return getViewFields(view).map((field) => getColumn(field, viewColumnsByField.get(field)));
}

function getColumn(
  field: string,
  column: TrackSelectColumn | undefined,
): GridColDef<CatalogGridRow> {
  return {
    field,
    headerName: column?.label ?? builtInLabels[field] ?? field,
    description: column?.description,
    width: column?.width,
    flex: column?.width ? undefined : 1,
    minWidth: 120,
  };
}

function getColumnVisibilityModel(view: TrackSelectView) {
  const visibility: GridColumnVisibilityModel = { id: false };

  for (const column of view.columns) {
    if (column.hidden) visibility[column.field] = false;
  }
  for (const field of view.grouping) visibility[field] = false;
  if (view.grouping.length > 0) visibility[view.leaf] = false;

  return visibility;
}

function getViewFields(view: TrackSelectView) {
  return [
    ...new Set(["id", ...view.columns.map((column) => column.field), ...view.grouping, view.leaf]),
  ];
}
