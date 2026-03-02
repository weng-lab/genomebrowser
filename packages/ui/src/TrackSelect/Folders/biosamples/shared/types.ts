/**
 * Types for biosample folder data
 */

export type CollectionType = "Core" | "Ancillary" | "Partial";

/**
 * Assay information from the JSON data.
 * Standard assays have a single `url`, while WGBS assays have `cpgPlus`, `cpgMinus`, `coverage`.
 */
export type BiosampleAssayInfo = {
  id: string;
  assay: string;
  url?: string;
  experimentAccession: string;
  fileAccession?: string;
  // WGBS-specific fields
  cpgPlus?: string;
  cpgMinus?: string;
  coverage?: string;
};

/**
 * Track information from the JSON data
 */
export type BiosampleTrackInfo = {
  name: string;
  ontology: string;
  lifeStage: string;
  sampleType: string;
  displayName: string;
  assays: BiosampleAssayInfo[];
  collection: CollectionType;
};

/**
 * Row format for DataGrid (flattened from TrackInfo).
 * Standard assays have a single `url`, while WGBS assays have `cpgPlus`, `cpgMinus`, `coverage`.
 */
export type BiosampleRowInfo = {
  id: string;
  ontology: string;
  lifeStage: string;
  sampleType: string;
  displayName: string;
  assay: string;
  experimentAccession: string;
  fileAccession?: string;
  url?: string;
  collection: CollectionType;
  // WGBS-specific fields
  cpgPlus?: string;
  cpgMinus?: string;
  coverage?: string;
};

/**
 * Structure of the biosample JSON data files
 */
export type BiosampleDataFile = {
  tracks: BiosampleTrackInfo[];
};
