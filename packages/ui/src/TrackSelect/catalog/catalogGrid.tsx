import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import {
  DataGridPremium,
  type GridColumnVisibilityModel,
  type GridRowSelectionModel,
  useGridApiRef,
} from "@mui/x-data-grid-premium";
import { useEffect, useMemo, useState } from "react";
import { getCatalogRows, getCatalogTrackIds, type CatalogGridRow } from "../catalog/catalogRows";
import { getCatalogColumns, type TrackSelectColumnOverrides } from "../catalog/catalogColumns";
import { trackSelectPanelHeight } from "../trackSelectConstants";
import { TrackSelectEmptyPanel } from "../trackSelectEmptyPanel";
import type { TrackSelectCatalog, TrackSelectView } from "../schema/catalogSchema";

type CatalogGridProps = {
  catalog: TrackSelectCatalog | undefined;
  view: TrackSelectView | undefined;
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  columnOverrides?: TrackSelectColumnOverrides;
};

type CatalogDataGridProps = {
  catalog: TrackSelectCatalog;
  view: TrackSelectView;
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  columnOverrides?: TrackSelectColumnOverrides;
};

export function CatalogGrid({
  catalog,
  view,
  selectedIds,
  onSelectionChange,
  columnOverrides,
}: CatalogGridProps) {
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
      columnOverrides={columnOverrides}
    />
  );
}

function CatalogDataGrid({
  catalog,
  view,
  selectedIds,
  onSelectionChange,
  columnOverrides,
}: CatalogDataGridProps) {
  const rows = useMemo(() => getCatalogRows(catalog), [catalog]);
  const validLeafIds = useMemo(() => getCatalogTrackIds(catalog), [catalog]);
  const columns = useMemo(
    () => getCatalogColumns(catalog.id, view, columnOverrides),
    [catalog.id, columnOverrides, view],
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>(
    () => getColumnVisibilityModel(view),
  );
  const apiRef = useGridApiRef();
  const [gridSelectionModel, setGridSelectionModel] = useState<GridRowSelectionModel>(() => ({
    type: "include",
    ids: selectedIds,
  }));

  useEffect(() => {
    const nextGridSelectionModel = apiRef.current?.getPropagatedRowSelectionModel({
      type: "include",
      ids: selectedIds,
    });
    if (!nextGridSelectionModel) return;

    setGridSelectionModel((current) =>
      selectionModelsAreEqual(current, nextGridSelectionModel) ? current : nextGridSelectionModel,
    );
  }, [apiRef, selectedIds]);

  return (
    <Paper sx={{ width: "100%" }}>
      <Box sx={{ height: trackSelectPanelHeight, width: "100%", overflow: "auto" }}>
        <DataGridPremium
          apiRef={apiRef}
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
            if (setsAreEqual(nextSelectedIds, selectedIds)) {
              setGridSelectionModel((current) =>
                selectionModelsAreEqual(current, selection) ? current : selection,
              );
              return;
            }
            onSelectionChange(nextSelectedIds);
          }}
          rowSelectionModel={gridSelectionModel}
          rowSelectionPropagation={{ descendants: true, parents: true }}
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

function setsAreEqual(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

function selectionModelsAreEqual(left: GridRowSelectionModel, right: GridRowSelectionModel) {
  if (left.type !== right.type || left.ids.size !== right.ids.size) return false;
  for (const id of left.ids) {
    if (!right.ids.has(id)) return false;
  }
  return true;
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
