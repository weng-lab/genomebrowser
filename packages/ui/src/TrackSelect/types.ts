import { UseTreeItemParameters } from "@mui/x-tree-view/useTreeItem";
import { TreeViewBaseItem } from "@mui/x-tree-view";
import {
  DataGridPremiumProps,
  GridColDef,
  GridRenderCellParams,
} from "@mui/x-data-grid-premium";
import { ReactElement, ReactNode } from "react";
import { SvgIconOwnProps } from "@mui/material";

/**
 * Custom Tree Props for RichTreeView Panel
 */
export type ExtendedTreeItemProps = {
  id: string;
  label: string;
  icon: string;
  folderId?: string;
  isAssayItem?: boolean;
  /**
   * The assay name for leaf nodes (experiment accession items)
   */
  assayName?: string;
  /**
   * list of all the experimentAccession values in the children/grandchildren of the item, or the accession of the item itself
   * this is used in updating the rowSelectionModel when removing items from the Tree View panel
   */
  allExpAccessions?: string[];
};

export type TreeViewWrapperProps = {
  items: TreeViewBaseItem<ExtendedTreeItemProps>[];
  selectedCount: number;
  onRemove: (item: TreeViewBaseItem<ExtendedTreeItemProps>) => void;
  /** Optional custom TreeItem component */
  TreeItemComponent?: React.ForwardRefExoticComponent<
    CustomTreeItemProps & React.RefAttributes<HTMLLIElement>
  >;
};

export interface CustomLabelProps {
  id: string;
  children: React.ReactNode;
  isAssayItem?: boolean;
  assayName?: string;
  icon?: React.ElementType | React.ReactElement | ReactNode;
  /** Optional function to render custom icons for assay items */
  renderIcon?: (name: string) => ReactNode;
}

export interface CustomTreeItemProps
  extends Omit<UseTreeItemParameters, "rootRef">,
    Omit<React.HTMLAttributes<HTMLLIElement>, "onFocus"> {
  onRemove?: (item: TreeViewBaseItem<ExtendedTreeItemProps>) => void;
  /** Optional function to render custom icons for assay items */
  renderIcon?: (name: string) => ReactNode;
}

/**
 * Types for useSelectionStore to keep track of selected DataGrid rows/tracks
 */
export type SelectionState = {
  selectedByFolder: Map<string, Set<string>>;
  activeFolderId: string;
};

export type SelectionAction = {
  clear: (folderId?: string) => void;
  setActiveFolder: (folderId: string) => void;
  setSelection: (folderId: string, ids: Set<string>) => void;
};

/**
 * DataGrid Props
 */
interface BaseTableProps extends Omit<DataGridPremiumProps, "columns"> {
  toolbarSlot?: ReactNode;
  /**
   * If anything besides an element, renders tooltip icon to the right of the table label with specified string as tooltip contents.
   * If an element, renders the element to the right of the table label.
   */
  labelTooltip?: ReactNode;
  /**
   * Styling object for the toolbar
   */
  toolbarStyle?: React.CSSProperties;
  /**
   * Color passed as `htmlColor` to columns, filter, download and search icons
   */
  toolbarIconColor?: SvgIconOwnProps["htmlColor"];
}

export type DataGridWrapperProps = {
  rows: any[];
  columns: GridColDef[];
  groupingModel: string[];
  leafField: string;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  /** Optional custom component for rendering grouping cells */
  GroupingCellComponent?: React.FC<GridRenderCellParams>;
};

//This enforces that a downloadFileName is specified if a ReactElement is used as the label (no default )
export type DataGridProps = DataGridWrapperProps &
  BaseTableProps &
  (
    | { label?: string; downloadFileName?: string }
    | { label: ReactElement; downloadFileName: string }
    | { label?: undefined; downloadFileName?: string }
  );
