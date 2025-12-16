import { GridColDef } from "@mui/x-data-grid-premium";
import { getTracksByAssayAndOntology, flattenIntoRow } from "./dataGridHelpers";
import { RowInfo } from "./types";

export const assayTypes = ["DNase", "H3K4me3", "H3K27ac", "ATAC", "CTCF", "ChromHMM"];
export const ontologyTypes = [
  "Adipose",
  "Adrenal gland",
  "Blood",
  "Blood vessel",
  "Bone",
  "Bone marrow",
  "Brain",
  "Breast",
  "Connective tissue",
  "Embryo",
  "Epithelium",
  "Esophagus",
  "Eye",
  "Fallopian Tube",
  "Gallbladder",
  "Heart",
  "Kidney",
  "Large Intestine",
  "Limb",
  "Liver",
  "Lung",
  "Lymphoid Tissue",
  "Muscle",
  "Mouth",
  "Nerve",
  "Nose",
  "Pancreas",
  "Parathyroid Gland",
  "Ovary",
  "Penis",
  "Placenta",
  "Prostate",
  "Skin",
  "Small Intestine",
  "Spinal Cord",
  "Spleen",
  "Stomach",
  "Testis",
  "Thymus",
  "Thyroid",
  "Urinary Bladder",
  "Uterus",
  "Vagina",
];

export const columns: GridColDef[] = [
  { field: "displayname", headerName: "Name" },
  { field: "ontology", headerName: "Ontology" },
  { field: "lifeStage", headerName: "Life Stage" },
  { field: "sampleType", headerName: "Sample Type" },
  { field: "assay", headerName: "Assay" },
  { field: "experimentAccession", headerName: "Experiment Accession" },
  { field: "fileAccession", headerName: "File Accession" },
];

export const rows = ontologyTypes.flatMap((ontology) =>
  assayTypes.flatMap((assay) =>
    getTracksByAssayAndOntology(
      assay.toLowerCase(),
      ontology.toLowerCase(),
    ).map((r) => {
      const flat = flattenIntoRow(r);
      return {
        ...flat,
        assay,
        ontology,
      };
    }),
  ),
);

// map of experimentAccession -> rowInfo for faster row lookup
export const rowById = new Map<string, RowInfo>(
  rows.map((r) => [r.experimentAccession, r]),
);