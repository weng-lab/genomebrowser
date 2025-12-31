import {
  getTracksByAssayAndOntology,
  flattenIntoRows,
  getTracksData,
} from "./DataGrid/dataGridHelpers";
import { RowInfo, TrackInfo } from "./types";

export type Assembly = "GRCh38" | "mm10";

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

/**
 * Build rows and rowById for a specific assembly
 */
export function buildRowsForAssembly(assembly: Assembly): {
  rows: RowInfo[];
  rowById: Map<string, RowInfo>;
} {
  const tracksData = getTracksData(assembly);
  const rows = ontologyTypes.flatMap((ontology) =>
    assayTypes.flatMap((assay) =>
      getTracksByAssayAndOntology(
        assay.toLowerCase(),
        ontology.toLowerCase(),
        tracksData,
      ).flatMap((r: TrackInfo) =>
        flattenIntoRows(r).map((flat) => ({
          ...flat,
          assay,
          ontology,
        })),
      ),
    ),
  );
  const rowById = new Map<string, RowInfo>(rows.map((r) => [r.id, r]));
  return { rows, rowById };
}

// Default exports for backwards compatibility (human assembly)
const humanData = buildRowsForAssembly("GRCh38");
export const rows = humanData.rows;
export const rowById = humanData.rowById;

/**
 * Check if an ID is a real track (exists in rowById) vs an auto-generated group ID
 */
export const isTrackId = (id: string): boolean => rowById.has(id);

/**
 * Filter a set of IDs to return only real track IDs (no auto-generated group IDs)
 */
export const getActiveTracks = (selectedIds: Set<string>): Set<string> =>
  new Set(Array.from(selectedIds).filter(isTrackId));
