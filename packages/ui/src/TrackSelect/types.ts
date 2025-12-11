import { FuseOptionKey } from "fuse.js";

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