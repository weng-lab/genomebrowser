import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import {
  DataGridPremium,
  type GridColumnVisibilityModel,
  type GridRowSelectionModel,
  useGridApiRef,
} from "@mui/x-data-grid-premium";
import { useEffect, useMemo, useState } from "react";
import { getCollectionRows, getCollectionTrackIds, type CollectionGridRow } from "./collectionRows";
import { getCollectionColumns, type TrackSelectColumnOverrides } from "./collectionColumns";
import { trackSelectPanelHeight } from "../trackSelectConstants";
import { TrackSelectEmptyPanel } from "../trackSelectEmptyPanel";
import type { TrackSelectCollection, TrackSelectView } from "../schema/collectionSchema";

type CollectionGridProps = {
  collection: TrackSelectCollection | undefined;
  view: TrackSelectView | undefined;
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  columnOverrides?: TrackSelectColumnOverrides;
};

type CollectionDataGridProps = {
  collection: TrackSelectCollection;
  view: TrackSelectView;
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  columnOverrides?: TrackSelectColumnOverrides;
};

export function CollectionGrid({
  collection,
  view,
  selectedIds,
  onSelectionChange,
  columnOverrides,
}: CollectionGridProps) {
  if (!collection || !view) {
    return <TrackSelectEmptyPanel>No track collection selected.</TrackSelectEmptyPanel>;
  }

  return (
    <CollectionDataGrid
      key={`${collection.id}:${view.id}`}
      collection={collection}
      view={view}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      columnOverrides={columnOverrides}
    />
  );
}

function CollectionDataGrid({
  collection,
  view,
  selectedIds,
  onSelectionChange,
  columnOverrides,
}: CollectionDataGridProps) {
  const rows = useMemo(() => getCollectionRows(collection), [collection]);
  const validLeafIds = useMemo(() => getCollectionTrackIds(collection), [collection]);
  const columns = useMemo(
    () => getCollectionColumns(collection.id, view, columnOverrides),
    [collection.id, columnOverrides, view],
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

    // MUI's propagated model includes synthetic group IDs that cannot be derived until its grid API
    // is initialized. This state intentionally adapts the external leaf-only controlled selection.
    // eslint-disable-next-line react-doctor/no-adjust-state-on-prop-change
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

function getRowId(row: CollectionGridRow) {
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
