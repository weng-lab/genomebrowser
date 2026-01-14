/**
 * Types for biosample folder data
 */

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
  displayname: string;
  assays: BiosampleAssayInfo[];
};

/**
 * Row format for DataGrid (flattened from TrackInfo)
 */
export type BiosampleRowInfo = {
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
 * Structure of the biosample JSON data files
 */
export type BiosampleDataFile = {
  tracks: BiosampleTrackInfo[];
};
