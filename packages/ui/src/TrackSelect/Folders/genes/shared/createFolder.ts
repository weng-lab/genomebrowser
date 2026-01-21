import { FolderDefinition } from "../../types";
import { GeneDataFile, GeneRowInfo, GeneTrackInfo } from "./types";
import {
  defaultColumns,
  defaultGroupingModel,
  defaultLeafField,
} from "./columns";
import { buildTreeView } from "./treeBuilder";

/**
 * Transforms a single track from JSON into a row for DataGrid
 * For genes, this is a 1:1 mapping (no flattening needed)
 */
function trackToRow(track: GeneTrackInfo): GeneRowInfo {
  return {
    id: track.id,
    displayName: track.displayName,
    versions: track.versions,
  };
}

/**
 * Transforms raw JSON data into rows and lookup map
 */
function transformData(data: GeneDataFile): {
  rows: GeneRowInfo[];
  rowById: Map<string, GeneRowInfo>;
} {
  const rows = data.map(trackToRow);
  const rowById = new Map<string, GeneRowInfo>(
    rows.map((row) => [row.id, row]),
  );
  return { rows, rowById };
}

export interface CreateGeneFolderOptions {
  id: string;
  label: string;
  description?: string;
  data: GeneDataFile;
}

/**
 * Factory function that creates a FolderDefinition for genes
 */
export function createGeneFolder(
  options: CreateGeneFolderOptions,
): FolderDefinition<GeneRowInfo> {
  const { id, label, description, data } = options;
  const { rowById } = transformData(data);

  return {
    id,
    label,
    description,
    rowById,
    getRowId: (row) => row.id,

    // Default view configuration
    columns: defaultColumns,
    groupingModel: defaultGroupingModel,
    leafField: defaultLeafField,

    // Tree builder for selected items panel
    buildTree: (selectedIds, rowById) =>
      buildTreeView(selectedIds, rowById, label),
  };
}
