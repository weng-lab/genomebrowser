import { FuseOptionKey } from "fuse.js";
import { UseTreeItemParameters } from "@mui/x-tree-view/useTreeItem";
import { TreeViewBaseItem } from "@mui/x-tree-view";

export interface SearchTracksProps {
  query: string;
  keyWeightMap: FuseOptionKey<any>[];
  jsonStructure?: string;
  treeItems?: TreeViewBaseItem<ExtendedTreeItemProps>[];
  threshold?: number;
  limit?: number;
}

export interface AssayInfo {
  assay: string; // dnase, atac, h3k4me3, h3k27ac, ctcf, chromhmm
  url: string;
  experimentAccession: string;
  fileAccession: string;
}

export interface TrackInfo {
  name: string;
  ontology: string;
  lifeStage: string;
  sampleType: string;
  displayname: string;
  assays: AssayInfo[];
}

export interface RowInfo {
  ontology: string;
  lifeStage: string;
  sampleType: string;
  displayname: string;
  assay: string;
  experimentAccession: string;
  fileAccession: string;
}

export type ExtendedTreeItemProps = {
  id: string;
  label: string;
  icon: string;
  isAssayItem?: boolean;
  /**
   * list of all the experimentAccession values in the children/grandchildren of the item, or the accession of the item itself
   * this is used in updating the rowSelectionModel when removing items from the Tree View panel
   */
  allExpAccessions?: string[];
  // list to allow search functionality in the treeview
  allRowInfo?: RowInfo[];
};

export type DataGridWrapperProps = {
  filteredRows: RowInfo[];
  selectedIds: Set<string>;
  setSelected: (ids: Set<string>) => void;
  sortedAssay: boolean;
};

export type DataGridProps = {
  assay: string;
}

export type TreeViewWrapperProps = {
  items: TreeViewBaseItem<ExtendedTreeItemProps>[];
  selectedIds: Set<string>;
  remove: (removedIds: Set<string>) => void;
};

export interface CustomLabelProps {
  id: string;
  children: React.ReactNode;
  isAssayItem?: boolean
  icon: React.ElementType | React.ReactElement;
}

export interface CustomTreeItemProps
  extends Omit<UseTreeItemParameters, "rootRef">,
    Omit<React.HTMLAttributes<HTMLLIElement>, "onFocus"> {
  onRemove?: (item: TreeViewBaseItem<ExtendedTreeItemProps>) => void;
}

export type SelectionState = {
  selectedIds: Set<string>;
};

export type SelectionAction = {
  setSelected: (ids: Set<string>) => void;
  remove: (removedIds: Set<string>) => void;
  clear: () => void;
};
