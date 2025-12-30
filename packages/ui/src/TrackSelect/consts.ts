import {
  getTracksByAssayAndOntology,
  flattenIntoRows,
} from "./DataGrid/dataGridHelpers";
import { RowInfo, TrackInfo } from "./types";

export const assayTypes = [
  "cCRE",
  "DNase",
  "H3K4me3",
  "H3K27ac",
  "ATAC",
  "CTCF",
  "RNA-seq",
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
    ).flatMap((r: TrackInfo) =>
      flattenIntoRows(r).map((flat) => ({
        ...flat,
        assay,
        ontology,
      })),
    ),
  ),
);

// map of id -> rowInfo for faster row lookup
export const rowById = new Map<string, RowInfo>(rows.map((r) => [r.id, r]));

/**
 * Check if an ID is a real track (exists in rowById) vs an auto-generated group ID
 */
export const isTrackId = (id: string): boolean => rowById.has(id);

/**
 * Filter a set of IDs to return only real track IDs (no auto-generated group IDs)
 */
export const getActiveTracks = (selectedIds: Set<string>): Set<string> =>
  new Set(Array.from(selectedIds).filter(isTrackId));
