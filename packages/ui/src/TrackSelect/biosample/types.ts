// Assembly types
export type Assembly = "GRCh38" | "mm10";

// Raw JSON data structure from humanBiosamples.json / mouseBiosamples.json
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

// Flattened row structure for DataGrid
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
