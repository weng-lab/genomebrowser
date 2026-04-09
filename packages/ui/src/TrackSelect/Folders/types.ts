import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid-premium";
import { TreeViewBaseItem } from "@mui/x-tree-view";
import { Track } from "@weng-lab/genomebrowser";
import { ExtendedTreeItemProps, CustomTreeItemProps } from "../types";

export type Assembly = "GRCh38" | "mm10";

export interface FolderView<TRow = any> {
  id: string;
  label: string;
  columns: GridColDef[];
  groupingModel: string[];
  leafField: string;
  buildTree: (
    selectedRows: TRow[],
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
  rows: TRow[];
  columns: GridColDef[];
  groupingModel: string[];
  leafField: string;

  /**
   * Builds a tree structure from selected rows.
   * Used to display selected items in the TreeView panel.
   *
   * @param selectedRows - Selected folder rows
   * @returns Array of tree items to render in the TreeView
   */
  buildTree: (
    selectedRows: TRow[],
  ) => TreeViewBaseItem<ExtendedTreeItemProps>[];

  /**
   * Creates a browser track from a folder row.
   *
   * This keeps folder-specific track creation logic colocated with the
   * folder's data and presentation logic instead of requiring consumers to
   * branch on folder IDs.
   */
  createTrack: (row: TRow, options: CreateTrackOptions) => Track | null;

  views?: FolderView<TRow>[];
  ViewSelector?: React.FC<{
    views: FolderView<TRow>[];
    activeViewId: string;
    onChange: (viewId: string) => void;
  }>;

  GroupingCellComponent?: React.FC<GridRenderCellParams>;
  TreeItemComponent?: React.ForwardRefExoticComponent<
    CustomTreeItemProps & React.RefAttributes<HTMLLIElement>
  >;
}
