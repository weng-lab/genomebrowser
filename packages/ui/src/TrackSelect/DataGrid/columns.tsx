import { GridColDef } from "@mui/x-data-grid-premium";
import { RowInfo } from "../types";
import { Stack, capitalize } from "@mui/material";
import { AssayIcon } from "../TreeView/treeViewHelpers";
import { ontologyTypes, assayTypes } from "../consts";

const displayNameCol: GridColDef<RowInfo> = {
  field: "displayname",
  headerName: "Name",
  valueFormatter: (value) => value && capitalize(value),
  maxWidth: 300,
};

const sortedByAssayOntologyCol: GridColDef<RowInfo> = {
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

const sortedByAssayAssayCol: GridColDef<RowInfo> = {
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

const defaultOntologyCol: GridColDef<RowInfo> = {
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

const defaultAssayCol: GridColDef<RowInfo> = {
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

const sampleTypeCol: GridColDef<RowInfo> = {
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

const lifeStageCol: GridColDef<RowInfo> = {
  field: "lifeStage",
  headerName: "Life Stage",
  type: "singleSelect",
  valueOptions: ["adult", "embryonic"],
  valueFormatter: (value) => value && capitalize(value),
};

const experimentCol: GridColDef<RowInfo> = {
  field: "experimentAccession",
  headerName: "Experiment Accession",
};

const fileCol: GridColDef<RowInfo> = {
  field: "fileAccession",
  headerName: "File Accession",
};

export const sortedByAssayColumns: GridColDef<RowInfo>[] = [
  displayNameCol,
  sortedByAssayOntologyCol,
  sampleTypeCol,
  lifeStageCol,
  sortedByAssayAssayCol,
  experimentCol,
  fileCol,
];

export const defaultColumns: GridColDef<RowInfo>[] = [
  defaultAssayCol,
  sampleTypeCol,
  lifeStageCol,
  defaultOntologyCol,
  displayNameCol,
  experimentCol,
  fileCol,
];
