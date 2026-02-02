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
import { AssayToggle } from "./AssayToggle";
import BiosampleGroupingCell from "./BiosampleGroupingCell";
import { BiosampleTreeItem } from "./BiosampleTreeItem";

/**
 * Flattens TrackInfo into RowInfo objects for DataGrid display.
 * Each track can have multiple assays, so this creates one row per assay.
 *
 * @param track - TrackInfo object from JSON data
 * @returns Array of flattened BiosampleRowInfo objects, one per assay
 */
function flattenTrackIntoRows(track: BiosampleTrackInfo): BiosampleRowInfo[] {
  const { ontology, lifeStage, sampleType, displayName, core } = track;

  // Sort assays so cCRE comes first, then maintain original order for the rest
  const sortedAssays = [...track.assays].sort((a, b) => {
    const aIsCcre = a.assay.toLowerCase() === "ccre";
    const bIsCcre = b.assay.toLowerCase() === "ccre";
    if (aIsCcre && !bIsCcre) return -1;
    if (!aIsCcre && bIsCcre) return 1;
    return 0;
  });

  return sortedAssays.map(
    ({ id, assay, experimentAccession, fileAccession, url }) => ({
      id,
      ontology: capitalize(ontology),
      lifeStage: capitalize(lifeStage),
      sampleType: capitalize(sampleType),
      displayName: capitalize(displayName),
      assay: formatAssayType(assay),
      experimentAccession,
      fileAccession,
      url,
      coreCollection: core ?? false,
    }),
  );
}

/**
 * Transforms raw JSON data into flattened rows and a lookup map.
 * Prefixes each row ID with the folder ID to ensure uniqueness across folders.
 *
 * @param data - Raw biosample data from JSON file
 * @param folderId - Folder ID to prefix row IDs with
 * @returns Object containing rows array and rowById map
 */
function transformData(data: BiosampleDataFile): {
  rowById: Map<string, BiosampleRowInfo>;
} {
  const rows = data.tracks.flatMap(flattenTrackIntoRows).map((row) => ({
    ...row,
    id: row.id,
  }));
  const rowById = new Map<string, BiosampleRowInfo>(
    rows.map((row) => [row.id, row]),
  );
  return { rowById };
}

export interface CreateBiosampleFolderOptions {
  /** Unique identifier for this folder */
  id: string;
  /** Display label shown in the UI */
  label: string;
  /** Optional description shown in folder cards */
  description?: string;
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
  const { id, label, description, data } = options;
  const { rowById } = transformData(data);

  return {
    id,
    label,
    description,
    rowById,
    getRowId: (row) => row.id,

    // Default view: ontology-based grouping
    columns: defaultColumns,
    groupingModel: defaultGroupingModel,
    leafField: defaultLeafField,

    // Build tree for selected items panel
    buildTree: (selectedIds, rowById) =>
      buildTreeView(selectedIds, rowById, label, id),

    // Biosample-specific toolbar: toggle between sample-grouped and assay-grouped views
    ToolbarExtras: AssayToggle,

    // Biosample-specific custom components
    GroupingCellComponent: BiosampleGroupingCell,
    TreeItemComponent: BiosampleTreeItem,
  };
}
