import { capitalize } from "@mui/material";
import { FolderDefinition } from "../../types";
import {
  BiosampleDataFile,
  BiosampleRowInfo,
  BiosampleTrackInfo,
} from "./types";
import {
  defaultColumns,
  defaultGroupingModel,
  defaultLeafField,
} from "./columns";
import { buildTreeView } from "./treeBuilder";
import { formatAssayType } from "./constants";

/**
 * Flattens TrackInfo into RowInfo objects for DataGrid display.
 * Each track can have multiple assays, so this creates one row per assay.
 *
 * @param track - TrackInfo object from JSON data
 * @returns Array of flattened BiosampleRowInfo objects, one per assay
 */
function flattenTrackIntoRows(track: BiosampleTrackInfo): BiosampleRowInfo[] {
  const { ontology, lifeStage, sampleType, displayname } = track;

  return track.assays.map(
    ({ id, assay, experimentAccession, fileAccession, url }) => ({
      id,
      ontology: capitalize(ontology),
      lifeStage: capitalize(lifeStage),
      sampleType: capitalize(sampleType),
      displayname: capitalize(displayname),
      assay: formatAssayType(assay),
      experimentAccession,
      fileAccession,
      url,
    }),
  );
}

/**
 * Transforms raw JSON data into flattened rows and a lookup map.
 *
 * @param data - Raw biosample data from JSON file
 * @returns Object containing rows array and rowById map
 */
function transformData(data: BiosampleDataFile): {
  rows: BiosampleRowInfo[];
  rowById: Map<string, BiosampleRowInfo>;
} {
  const rows = data.tracks.flatMap(flattenTrackIntoRows);
  const rowById = new Map<string, BiosampleRowInfo>(
    rows.map((row) => [row.id, row]),
  );
  return { rows, rowById };
}

export interface CreateBiosampleFolderOptions {
  /** Unique identifier for this folder */
  id: string;
  /** Display label shown in the UI */
  label: string;
  /** Raw biosample data from JSON file */
  data: BiosampleDataFile;
}

/**
 * Factory function that creates a FolderDefinition for biosample data.
 *
 * This handles all the common setup for biosample folders:
 * - Transforms JSON data into flattened rows
 * - Creates the rowById lookup map
 * - Configures columns, grouping, and tree building
 *
 * @param options - Configuration options for the folder
 * @returns A complete FolderDefinition for the biosample data
 */
export function createBiosampleFolder(
  options: CreateBiosampleFolderOptions,
): FolderDefinition<BiosampleRowInfo> {
  const { id, label, data } = options;
  const { rowById } = transformData(data);

  return {
    id,
    label,
    rowById,
    getRowId: (row) => row.id,

    // Default view: ontology-based grouping
    columns: defaultColumns,
    groupingModel: defaultGroupingModel,
    leafField: defaultLeafField,

    // Build tree for selected items panel
    buildTree: (selectedIds, rowById) =>
      buildTreeView(selectedIds, rowById, label),

    // ToolbarExtras will be added in task 2.1 (AssayToggle)
  };
}
