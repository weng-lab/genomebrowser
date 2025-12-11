import { FuseOptionKey } from "fuse.js";
import {
  UseTreeItemParameters,
} from "@mui/x-tree-view/useTreeItem";

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
  icon: string;
  id: string;
  label: string;
};

export interface CustomLabelProps {
  children: React.ReactNode;
  icon: React.ElementType | React.ReactElement;
}

export interface CustomTreeItemProps
  extends Omit<UseTreeItemParameters, "rootRef">,
    Omit<React.HTMLAttributes<HTMLLIElement>, "onFocus"> {}