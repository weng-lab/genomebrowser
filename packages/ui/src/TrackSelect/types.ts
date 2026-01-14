import { FuseOptionKey } from "fuse.js";
import { UseTreeItemParameters } from "@mui/x-tree-view/useTreeItem";
import { TreeViewBaseItem } from "@mui/x-tree-view";
import {
  DataGridPremiumProps,
  GridRowSelectionModel,
} from "@mui/x-data-grid-premium";
import { ReactElement, ReactNode } from "react";
import { SvgIconOwnProps } from "@mui/material";

export interface SearchTracksProps {
  query: string;
  keyWeightMap: FuseOptionKey<any>[];
  jsonStructure?: string;
  treeItems?: TreeViewBaseItem<ExtendedTreeItemProps>[];
  threshold?: number;
  limit?: number;
}

/**
 * Types for the JSON-formatted tracks fomr modifiedHumanTracks.json
 */
export type AssayInfo = {
  id: string;
  assay: string;
  url: string;
  experimentAccession: string;
  fileAccession: string;
};

export type TrackInfo = {
  name: string;
  ontology: string;
  lifeStage: string;
  sampleType: string;
  displayname: string;
  assays: AssayInfo[];
};

/**
 *  Row format for DataGrid
 */
export type RowInfo = {
  id: string;
  ontology: string;
  lifeStage: string;
  sampleType: string;
  displayname: string;
  assay: string;
  experimentAccession: string;
  fileAccession: string;
  url: string;
};

/**
 * Custom Tree Props for RichTreeView Panel
 */
export type ExtendedTreeItemProps = {
  id: string;
  label: string;
  icon: string;
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
  // list to allow search functionality in the treeview
  allRowInfo?: RowInfo[];
};

export type TreeViewWrapperProps = {
  items: TreeViewBaseItem<ExtendedTreeItemProps>[];
  selectedCount: number;
  onRemove: (item: TreeViewBaseItem<ExtendedTreeItemProps>) => void;
};

export interface CustomLabelProps {
  id: string;
  children: React.ReactNode;
  isAssayItem?: boolean;
  assayName?: string;
  icon: React.ElementType | React.ReactElement;
}

export interface CustomTreeItemProps
  extends Omit<UseTreeItemParameters, "rootRef">,
    Omit<React.HTMLAttributes<HTMLLIElement>, "onFocus"> {
  onRemove?: (item: TreeViewBaseItem<ExtendedTreeItemProps>) => void;
}

/**
 * Types for useSelectionStore to keep track of selected DataGrid rows/tracks
 */
export type SelectionState = {
  selectedByFolder: Map<string, Set<string>>;
  activeFolderId: string;
};

export type SelectionAction = {
  select: (folderId: string, ids: Set<string>) => void;
  deselect: (folderId: string, ids: Set<string>) => void;
  clear: (folderId?: string) => void;
  setActiveFolder: (folderId: string) => void;
  getAllSelectedIds: () => Set<string>;
  getSelectedForFolder: (folderId: string) => Set<string>;
  getTotalCount: () => number;
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

type DataGridWrapperProps = {
  rows: RowInfo[];
  selectedIds: Set<string>; // all IDs including auto-generated group IDs
  handleSelection: (newSelection: GridRowSelectionModel) => void;
  sortedAssay: boolean;
};

//This enforces that a downloadFileName is specified if a ReactElement is used as the label (no default )
export type DataGridProps = DataGridWrapperProps &
  BaseTableProps &
  (
    | { label?: string; downloadFileName?: string }
    | { label: ReactElement; downloadFileName: string }
    | { label?: undefined; downloadFileName?: string }
  );
