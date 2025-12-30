import { FuseOptionKey } from "fuse.js";
import { UseTreeItemParameters } from "@mui/x-tree-view/useTreeItem";
import { TreeViewBaseItem } from "@mui/x-tree-view";
import {
  DataGridPremiumProps,
  GridRowSelectionModel,
} from "@mui/x-data-grid-premium";
import { ReactElement, ReactNode } from "react";
import { SvgIconOwnProps } from "@mui/material";
import { SelectionStoreInstance } from "./store";

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
  store: SelectionStoreInstance;
  items: TreeViewBaseItem<ExtendedTreeItemProps>[];
  trackIds: Set<string>; // real track IDs only (no auto-generated)
  isSearchResult: boolean;
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
  maxTracks: number;
  // All selected IDs including auto-generated group IDs from DataGrid
  selectedIds: Set<string>;
};

export type SelectionAction = {
  // Returns only real track IDs (filters out auto-generated group IDs)
  getTrackIds: () => Set<string>;
  // Returns a Map of track IDs to RowInfo (no auto-generated IDs)
  getTrackMap: () => Map<string, RowInfo>;
  setSelected: (ids: Set<string>) => void;
  removeIds: (removedIds: Set<string>) => void;
  clear: () => void;
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
