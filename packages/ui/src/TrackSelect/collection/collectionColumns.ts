import { createElement } from "react";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid-premium";
import { DataGridCellValue, ValueMarkerCell } from "./CollectionCells";
import type { CollectionGridRow } from "./collectionCompilation";
import type { TrackSelectColumn, TrackSelectView } from "../schema/collectionSchema";

export type TrackSelectColumnOverride = Omit<Partial<GridColDef>, "field">;

export type TrackSelectColumnOverrides = Readonly<
  Record<string, Readonly<Record<string, TrackSelectColumnOverride>>>
>;

export type ValueMarkerConfig = {
  color: string;
};

export type ValueMarkerMap = Readonly<Record<string, string | ValueMarkerConfig>>;

const builtInLabels: Record<string, string> = {
  id: "ID",
  title: "Title",
  type: "Type",
};

export function getCollectionColumns(
  collectionId: string,
  view: TrackSelectView,
  columnOverrides?: TrackSelectColumnOverrides,
): GridColDef<CollectionGridRow>[] {
  const viewColumnsByField = new Map(view.columns.map((column) => [column.field, column]));
  const collectionOverrides = columnOverrides?.[collectionId];

  return getViewFields(view).map((field) => {
    const override = collectionOverrides?.[field];

    return {
      ...getColumn(field, viewColumnsByField.get(field)),
      ...(override?.width !== undefined && override.flex === undefined ? { flex: undefined } : {}),
      ...override,
      field,
    };
  });
}

export function withValueMarkers(markers: ValueMarkerMap): TrackSelectColumnOverride {
  const markerConfigs = new Map(
    Object.entries(markers).map(([value, marker]) => [
      value,
      typeof marker === "string" ? { color: marker } : marker,
    ]),
  );

  return {
    renderCell: (params) => {
      const value = params.formattedValue ?? params.value;
      return createElement(ValueMarkerCell, {
        value,
        marker: markerConfigs.get(String(value ?? "")),
      });
    },
  };
}

function getColumn(
  field: string,
  column: TrackSelectColumn | undefined,
): GridColDef<CollectionGridRow> {
  return {
    field,
    headerName: column?.label ?? builtInLabels[field] ?? field,
    description: column?.description,
    width: column?.width,
    flex: column?.width ? undefined : 1,
    minWidth: 120,
    renderCell: renderDefaultCell,
  };
}

function renderDefaultCell(params: GridRenderCellParams<CollectionGridRow>) {
  return createElement(DataGridCellValue, { value: params.formattedValue ?? params.value });
}

function getViewFields(view: TrackSelectView) {
  return [
    ...new Set(["id", ...view.columns.map((column) => column.field), ...view.grouping, view.leaf]),
  ];
}
