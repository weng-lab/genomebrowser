import { FuseOptionKey } from "fuse.js";
import {
  UseTreeItemParameters,
} from "@mui/x-tree-view/useTreeItem";
import { TreeViewBaseItem } from "@mui/x-tree-view";

export interface SearchTracksProps {
    jsonStructure: string;
    query: string;
    keyWeightMap: FuseOptionKey<any>[];
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
  /**
   * list of all the experimentAccession values in the children/grandchildren of the item, or the accession of the item itself
   * this is used in updating the rowSelectionModel when removing items from the Tree View panel
   */
  allExpAccessions?: string[]; 
};

export interface CustomLabelProps {
  children: React.ReactNode;
  icon: React.ElementType | React.ReactElement;
}

export interface CustomTreeItemProps
  extends Omit<UseTreeItemParameters, "rootRef">,
    Omit<React.HTMLAttributes<HTMLLIElement>, "onFocus"> {
      onRemove?: (item: TreeViewBaseItem<ExtendedTreeItemProps>) => void;
    }