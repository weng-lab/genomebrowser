import { GridColDef } from "@mui/x-data-grid-premium";
import { Assembly, RowInfo } from "./types";
import { defaultColumns, sortedByAssayColumns } from "./columns";

/**
 * Grouping mode defines how to organize both DataGrid and TreeView
 */
export interface GroupingModeConfig {
  id: string;
  label: string;

  // DataGrid grouping fields
  dataGridGrouping: (keyof RowInfo)[];

  // TreeView grouping fields (defines hierarchy)
  treeGrouping: (keyof RowInfo)[];

  // Which field is the "leaf" in grouped columns
  leafField: keyof RowInfo;

  // Column configuration for this mode
  columns: GridColDef<RowInfo>[];
}

/**
 * Complete configuration for TrackSelect component
 */
export interface BiosampleTrackSelectConfig {
  // Assembly determines which data to load
  assembly: Assembly;

  // Available grouping modes
  groupingModes: GroupingModeConfig[];
  defaultGroupingModeId: string;

  // Search configuration
  searchFields: (keyof RowInfo)[];
  searchThreshold?: number;
  searchDebounceMs?: number;

  // Selection limits
  maxSelection: number;
  initialSelection?: Set<string>;

  // UI labels
  rootLabel: string;

  // Callbacks
  onSubmit?: (trackIds: Set<string>) => void;
  onCancel?: () => void;
  onReset?: () => void;
}

/**
 * Factory function to create biosample configuration
 */
export function createBiosampleConfig(
  assembly: Assembly,
  options?: {
    initialSelection?: Set<string>;
    onSubmit?: (trackIds: Set<string>) => void;
    onCancel?: () => void;
    onReset?: () => void;
  }
): BiosampleTrackSelectConfig {
  return {
    assembly,

    groupingModes: [
      {
        id: "default",
        label: "Default",
        dataGridGrouping: ["ontology", "displayname"],
        treeGrouping: ["ontology", "displayname", "assay"],
        leafField: "assay",
        columns: defaultColumns,
      },
      {
        id: "by-assay",
        label: "Sort by assay",
        dataGridGrouping: ["assay", "ontology"],
        treeGrouping: ["assay", "ontology", "displayname"],
        leafField: "displayname",
        columns: sortedByAssayColumns,
      },
    ],
    defaultGroupingModeId: "default",

    searchFields: [
      "displayname",
      "ontology",
      "lifeStage",
      "sampleType",
      "assay",
      "experimentAccession",
      "fileAccession",
    ],
    searchThreshold: 0.75,
    searchDebounceMs: 300,

    maxSelection: 30,
    initialSelection: options?.initialSelection,

    rootLabel: "Biosamples",

    onSubmit: options?.onSubmit,
    onCancel: options?.onCancel,
    onReset: options?.onReset,
  };
}
