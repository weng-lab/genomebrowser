import { isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  DataGridCellValue,
  getCatalogColumns,
  ValueMarkerCell,
  withValueMarkers,
} from "../src/TrackSelect/catalog/catalogColumns";
import type { TrackSelectView } from "../src/TrackSelect/schema/catalogSchema";

const defaultView: TrackSelectView = {
  id: "default",
  label: "Default",
  columns: [
    { field: "assay", label: "Assay" },
    { field: "biosample", label: "Biosample" },
  ],
  grouping: [],
  leaf: "title",
};

describe("TrackSelect catalog columns", () => {
  it("adds the default value renderer to generated columns", () => {
    const columns = getCatalogColumns("catalog-a", defaultView);
    const assayColumn = columns.find((column) => column.field === "assay");
    const rendered = assayColumn?.renderCell?.({
      value: "ATAC",
      formattedValue: "Assay: ATAC",
    } as never);

    expect(assayColumn?.renderCell).toBeTypeOf("function");
    expect(rendered).toSatisfy(isValidElement);
    expect(getElementType(rendered)).toBe(DataGridCellValue);
    expect(getElementProps<{ value: unknown }>(rendered).value).toBe("Assay: ATAC");
  });

  it("applies overrides by catalog and field", () => {
    const renderCell = () => "custom cell";
    const columnOverrides = {
      "catalog-a": {
        assay: { width: 220, renderCell },
        missing: { width: 500 },
      },
      "catalog-b": {
        assay: { width: 300 },
      },
    };

    const catalogAColumns = getCatalogColumns("catalog-a", defaultView, columnOverrides);
    const catalogBColumns = getCatalogColumns("catalog-b", defaultView, columnOverrides);
    const catalogCColumns = getCatalogColumns("catalog-c", defaultView, columnOverrides);

    expect(catalogAColumns.find((column) => column.field === "assay")).toMatchObject({
      width: 220,
      renderCell,
    });
    expect(catalogAColumns.find((column) => column.field === "assay")?.flex).toBeUndefined();
    expect(catalogBColumns.find((column) => column.field === "assay")?.width).toBe(300);
    expect(catalogCColumns.find((column) => column.field === "assay")?.width).toBeUndefined();
    expect(catalogAColumns.some((column) => column.field === "missing")).toBe(false);
  });

  it("applies a catalog override across its views", () => {
    const columnOverrides = { "catalog-a": { assay: { width: 220 } } };
    const alternateView: TrackSelectView = {
      ...defaultView,
      id: "alternate",
      label: "Alternate",
      columns: [{ field: "assay", label: "Data type" }],
    };

    const defaultAssay = getCatalogColumns("catalog-a", defaultView, columnOverrides).find(
      (column) => column.field === "assay",
    );
    const alternateAssay = getCatalogColumns("catalog-a", alternateView, columnOverrides).find(
      (column) => column.field === "assay",
    );

    expect(defaultAssay?.width).toBe(220);
    expect(alternateAssay?.width).toBe(220);
  });
});

describe("DataGridCellValue", () => {
  it("renders empty nullish values with ellipsis and tooltip behavior", () => {
    const tooltip = DataGridCellValue({ value: null });
    const tooltipProps = getElementProps<{ title: string; children: ReactNode }>(tooltip);
    const valueProps = getElementProps<{
      children: string;
      sx: Record<string, unknown>;
    }>(tooltipProps.children);

    expect(tooltipProps.title).toBe("");
    expect(valueProps.children).toBe("");
    expect(valueProps.sx).toMatchObject({
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });
  });
});

describe("withValueMarkers", () => {
  const markerColumn = withValueMarkers({
    ATAC: "#02c7b9",
    RNA: { color: "#00aa00" },
  });

  it("normalizes marker colors and uses formatted values for matching", () => {
    const atacCell = markerColumn.renderCell?.({
      value: "atac",
      formattedValue: "ATAC",
    } as never);
    const rnaCell = markerColumn.renderCell?.({ value: "RNA" } as never);

    expect(getElementType(atacCell)).toBe(ValueMarkerCell);
    expect(getElementProps<{ marker: { color: string } }>(atacCell).marker).toEqual({
      color: "#02c7b9",
    });
    expect(getElementProps<{ marker: { color: string } }>(rnaCell).marker).toEqual({
      color: "#00aa00",
    });
  });

  it("renders a square marker and the normal value cell", () => {
    const markerCell = ValueMarkerCell({ value: "ATAC", marker: { color: "#02c7b9" } });
    const markerCellProps = getElementProps<{ children: ReactNode[] }>(markerCell);
    const [marker, valueCell] = markerCellProps.children;

    expect(getElementProps<{ sx: Record<string, unknown> }>(marker).sx).toMatchObject({
      width: 10,
      height: 10,
      backgroundColor: "#02c7b9",
    });
    expect(getElementType(valueCell)).toBe(DataGridCellValue);
    expect(getElementProps<{ value: unknown }>(valueCell).value).toBe("ATAC");
  });

  it("falls back to the normal value cell when no marker matches", () => {
    const rendered = markerColumn.renderCell?.({ value: "WGBS" } as never);
    const markerProps = getElementProps<{
      value: unknown;
      marker: { color: string } | undefined;
    }>(rendered);
    const valueCell = ValueMarkerCell(markerProps);

    expect(markerProps.marker).toBeUndefined();
    expect(getElementType(valueCell)).toBe(DataGridCellValue);
    expect(getElementProps<{ value: unknown }>(valueCell).value).toBe("WGBS");
  });
});

function getElementProps<Props>(node: ReactNode) {
  if (!isValidElement<Props>(node)) throw new Error("Expected a React element");
  return node.props;
}

function getElementType(node: ReactNode) {
  if (!isValidElement(node)) throw new Error("Expected a React element");
  return node.type;
}
