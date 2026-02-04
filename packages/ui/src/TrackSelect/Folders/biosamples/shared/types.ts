/**
 * Types for biosample folder data
 */

export type CollectionType = "Core" | "Ancillary" | "Partial";

/**
 * Assay information from the JSON data
 */
export type BiosampleAssayInfo = {
  id: string;
  assay: string;
  url: string;
  experimentAccession: string;
  fileAccession: string;
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
 * Row format for DataGrid (flattened from TrackInfo)
 */
export type BiosampleRowInfo = {
  id: string;
  ontology: string;
  lifeStage: string;
  sampleType: string;
  displayName: string;
  assay: string;
  experimentAccession: string;
  fileAccession: string;
  url: string;
  collection: CollectionType;
};

/**
 * Structure of the biosample JSON data files
 */
export type BiosampleDataFile = {
  tracks: BiosampleTrackInfo[];
};
