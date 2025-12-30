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

// map of fileAccession -> rowInfo for faster row lookup
export const rowById = new Map<string, RowInfo>(
  rows.map((r) => [r.fileAccession, r]),
);

/**
 * Check if an ID is a real track (exists in rowById) vs an auto-generated group ID
 */
export const isTrackId = (id: string): boolean => rowById.has(id);

/**
 * Filter a set of IDs to return only real track IDs (no auto-generated group IDs)
 */
export const getActiveTracks = (selectedIds: Set<string>): Set<string> =>
  new Set(Array.from(selectedIds).filter(isTrackId));
