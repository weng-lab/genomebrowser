import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid-premium";
import type { CatalogGridRow } from "./catalogRows";
import type { TrackSelectColumn, TrackSelectView } from "../schema/catalogSchema";

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

export function getCatalogColumns(
  catalogId: string,
  view: TrackSelectView,
  columnOverrides?: TrackSelectColumnOverrides,
): GridColDef<CatalogGridRow>[] {
  const viewColumnsByField = new Map(view.columns.map((column) => [column.field, column]));
  const catalogOverrides = columnOverrides?.[catalogId];

  return getViewFields(view).map((field) => {
    const override = catalogOverrides?.[field];

    return {
      ...getColumn(field, viewColumnsByField.get(field)),
      ...(override?.width !== undefined && override.flex === undefined ? { flex: undefined } : {}),
      ...override,
      field,
    };
  });
}

export function DataGridCellValue({ value }: { value: unknown }) {
  const text = String(value ?? "");

  return (
    <Tooltip title={text} enterDelay={500} placement="top-start">
      <Box
        component="span"
        sx={{
          display: "block",
          flex: 1,
          minWidth: 0,
          width: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </Box>
    </Tooltip>
  );
}

export function ValueMarkerCell({
  value,
  marker,
}: {
  value: unknown;
  marker: ValueMarkerConfig | undefined;
}) {
  if (!marker) return <DataGridCellValue value={value} />;

  return (
    <Box
      component="span"
      sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, width: "100%" }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{ width: 10, height: 10, flex: "0 0 auto", backgroundColor: marker.color }}
      />
      <DataGridCellValue value={value} />
    </Box>
  );
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
      return <ValueMarkerCell value={value} marker={markerConfigs.get(String(value ?? ""))} />;
    },
  };
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
    renderCell: renderDefaultCell,
  };
}

function renderDefaultCell(params: GridRenderCellParams<CatalogGridRow>) {
  return <DataGridCellValue value={params.formattedValue ?? params.value} />;
}

function getViewFields(view: TrackSelectView) {
  return [
    ...new Set(["id", ...view.columns.map((column) => column.field), ...view.grouping, view.leaf]),
  ];
}
