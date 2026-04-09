import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid-premium";
import { TreeViewBaseItem } from "@mui/x-tree-view";
import { Track } from "@weng-lab/genomebrowser";
import { ExtendedTreeItemProps, CustomTreeItemProps } from "../types";

export type Assembly = "GRCh38" | "mm10";

/**
 * Runtime configuration that can be modified by ToolbarExtras components.
 * This allows folder-specific UI (like AssayToggle) to dynamically update
 * how the DataGrid and TreeView display data.
 */
export interface FolderRuntimeConfig {
  columns: GridColDef[];
  groupingModel: string[];
  leafField: string;
  buildTree?: (
    selectedIds: string[],
    rowById: Map<string, any>,
  ) => TreeViewBaseItem<ExtendedTreeItemProps>[];
}

/** Options passed to folder-owned track factories. */
export interface CreateTrackOptions {
  assembly: Assembly;
  [key: string]: unknown;
}

/**
 * Definition for a folder in TrackSelect.
 *
 * A folder represents a category of data (e.g., biosamples, genes, etc.)
 * that can be displayed in the DataGrid and TreeView. Each folder is
 * self-contained with its own data, column definitions, and tree building logic.
 *
 * @template TRow - The type of row data stored in this folder
 */
export interface FolderDefinition<TRow = any> {
  id: string;
  label: string;
  description?: string;
  rowById: Map<string, TRow>;
  getRowId: (row: TRow) => string;
  columns: GridColDef[];
  groupingModel: string[];
  leafField: string;

  /**
   * Builds a tree structure from selected row IDs.
   * Used to display selected items in the TreeView panel.
   *
   * @param selectedIds - Array of selected row IDs
   * @param rowById - Map of row ID to row data (same as this.rowById)
   * @returns Array of tree items to render in the TreeView
   */
  buildTree: (
    selectedIds: string[],
    rowById: Map<string, TRow>,
  ) => TreeViewBaseItem<ExtendedTreeItemProps>[];

  /**
   * Creates a browser track from a folder row.
   *
   * This keeps folder-specific track creation logic colocated with the
   * folder's data and presentation logic instead of requiring consumers to
   * branch on folder IDs.
   */
  createTrack: (row: TRow, options: CreateTrackOptions) => Track | null;

  /**
   * Optional component to render folder-specific toolbar controls.
   * For example, biosamples folder uses this to render an assay toggle
   * that switches between sample-grouped and assay-grouped views.
   *
   * @param updateConfig - Callback to update the folder's runtime config
   * @param folderId - The folder's unique identifier
   * @param label - The folder's display label
   * @param config - The current runtime config for this folder
   */
  ToolbarExtras?: React.FC<{
    updateConfig: (partial: Partial<FolderRuntimeConfig>) => void;
    folderId: string;
    label: string;
    config: FolderRuntimeConfig;
  }>;

  GroupingCellComponent?: React.FC<GridRenderCellParams>;
  TreeItemComponent?: React.ForwardRefExoticComponent<
    CustomTreeItemProps & React.RefAttributes<HTMLLIElement>
  >;
}
