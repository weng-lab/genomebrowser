import { GridColDef } from "@mui/x-data-grid-premium";
import { Stack, capitalize } from "@mui/material";
import { AssayIcon, ontologyTypes, assayTypes } from "./constants";
import { BiosampleRowInfo } from "./types";

const displayNameCol: GridColDef<BiosampleRowInfo> = {
  field: "displayName",
  headerName: "Name",
  valueFormatter: (value) => value && capitalize(value),
  maxWidth: 300,
};

const sortedByAssayOntologyCol: GridColDef<BiosampleRowInfo> = {
  field: "ontology",
  headerName: "Ontology",
  type: "singleSelect",
  valueOptions: ontologyTypes,
  renderCell: (params) => {
    if (params.rowNode.type === "group") {
      if (params.value === undefined) {
        return null;
      }
      const val = params.value;
      return (
        <div>
          <b>{val}</b>
        </div>
      );
    }
  },
};

const sortedByAssayAssayCol: GridColDef<BiosampleRowInfo> = {
  field: "assay",
  headerName: "Assay",
  valueOptions: assayTypes,
  renderCell: (params) => {
    if (params.rowNode.type === "group") {
      if (params.value === undefined) {
        return null;
      }
      const val = params.value;
      return (
        <Stack direction="row" spacing={2} alignItems="center">
          {AssayIcon(val)}
          <div>
            <b>{val}</b>
          </div>
        </Stack>
      );
    }
  },
};

const defaultOntologyCol: GridColDef<BiosampleRowInfo> = {
  field: "ontology",
  headerName: "Ontology",
  type: "singleSelect",
  valueOptions: ontologyTypes,
  renderCell: (params) => {
    if (params.rowNode.type === "group") {
      if (params.value === undefined) {
        return null;
      }
      const val = params.value;
      return (
        <div>
          <b>{val}</b>
        </div>
      );
    }
  },
};

const defaultAssayCol: GridColDef<BiosampleRowInfo> = {
  field: "assay",
  headerName: "Assay",
  valueOptions: assayTypes,
  renderCell: (params) => {
    if (params.value === undefined) {
      return null;
    }
    const val = params.value;
    return (
      <Stack direction="row" spacing={2} alignItems="center" sx={{ ml: 6 }}>
        {AssayIcon(val)}
        <div>{val}</div>
      </Stack>
    );
  },
};

const sampleTypeCol: GridColDef<BiosampleRowInfo> = {
  field: "sampleType",
  headerName: "Sample Type",
  type: "singleSelect",
  valueOptions: [
    "tissue",
    "primary cell",
    "cell line",
    "in vitro differentiated cells",
    "organoid",
  ],
  valueFormatter: (value) => value && capitalize(value),
};

const lifeStageCol: GridColDef<BiosampleRowInfo> = {
  field: "lifeStage",
  headerName: "Life Stage",
  type: "singleSelect",
  valueOptions: ["adult", "embryonic"],
  valueFormatter: (value) => value && capitalize(value),
};

const experimentCol: GridColDef<BiosampleRowInfo> = {
  field: "experimentAccession",
  headerName: "Experiment Accession",
};

const fileCol: GridColDef<BiosampleRowInfo> = {
  field: "fileAccession",
  headerName: "File Accession",
};

const idCol: GridColDef<BiosampleRowInfo> = {
  field: "id",
  headerName: "ID",
};

/** Columns for sorted-by-assay view (assay as top-level grouping) */
export const sortedByAssayColumns: GridColDef<BiosampleRowInfo>[] = [
  displayNameCol,
  sortedByAssayOntologyCol,
  sampleTypeCol,
  lifeStageCol,
  sortedByAssayAssayCol,
  experimentCol,
  fileCol,
  idCol,
];

/** Default columns (ontology as top-level grouping) */
export const defaultColumns: GridColDef<BiosampleRowInfo>[] = [
  defaultAssayCol,
  sampleTypeCol,
  lifeStageCol,
  defaultOntologyCol,
  displayNameCol,
  experimentCol,
  fileCol,
  idCol,
];

/** Grouping model for sorted-by-assay view */
export const sortedByAssayGroupingModel = ["assay", "ontology", "displayName"];

/** Default grouping model (ontology-based) */
export const defaultGroupingModel = ["ontology", "displayName"];

/** Leaf field for sorted-by-assay view */
export const sortedByAssayLeafField = "id";

/** Default leaf field */
export const defaultLeafField = "assay";
