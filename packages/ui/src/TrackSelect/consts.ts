import {
  getTracksByAssayAndOntology,
  flattenIntoRow,
} from "./DataGrid/dataGridHelpers";
import { RowInfo, TrackInfo } from "./types";

export const assayTypes = [
  "DNase",
  "H3K4me3",
  "H3K27ac",
  "ATAC",
  "CTCF",
  "ChromHMM",
];

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

export const rows = ontologyTypes.flatMap((ontology) =>
  assayTypes.flatMap((assay) =>
    getTracksByAssayAndOntology(
      assay.toLowerCase(),
      ontology.toLowerCase(),
    ).map((r: TrackInfo) => {
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
