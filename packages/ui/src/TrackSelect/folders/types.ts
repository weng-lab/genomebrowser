import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid-premium";
import { TreeViewBaseItem } from "@mui/x-tree-view";
import { ExtendedTreeItemProps, CustomTreeItemProps } from "../types";

export type Assembly = "GRCh38" | "mm10";

/**
 * Runtime configuration that can be modified by ToolbarExtras components.
 * This allows folder-specific UI (like AssayToggle) to dynamically update
 * how the DataGrid displays data.
 */
export interface FolderRuntimeConfig {
  columns: GridColDef[];
  groupingModel: string[];
  leafField: string;
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
  /** Unique identifier for this folder */
  id: string;

  /** Display label shown in the UI */
  label: string;

  /**
   * Single source of truth for all row data.
   * Maps row ID to the full row object.
   */
  rowById: Map<string, TRow>;

  /**
   * Function to extract the unique ID from a row object.
   * Used for selection tracking and lookups.
   */
  getRowId: (row: TRow) => string;

  /** Column definitions for the DataGrid */
  columns: GridColDef[];

  /** Fields to group by in the DataGrid (row grouping) */
  groupingModel: string[];

  /** The field that represents the leaf level in the grouping hierarchy */
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
   * Optional component to render folder-specific toolbar controls.
   * For example, biosamples folder uses this to render an assay toggle
   * that switches between sample-grouped and assay-grouped views.
   *
   * @param updateConfig - Callback to update the folder's runtime config
   */
  ToolbarExtras?: React.FC<{
    updateConfig: (partial: Partial<FolderRuntimeConfig>) => void;
  }>;

  /**
   * Optional custom component for rendering grouping cells in the DataGrid.
   * If not provided, a default grouping cell renderer will be used.
   */
  GroupingCellComponent?: React.FC<GridRenderCellParams>;

  /**
   * Optional custom TreeItem component for the TreeView.
   * If not provided, the default CustomTreeItem will be used.
   */
  TreeItemComponent?: React.ForwardRefExoticComponent<
    CustomTreeItemProps & React.RefAttributes<HTMLLIElement>
  >;
}
