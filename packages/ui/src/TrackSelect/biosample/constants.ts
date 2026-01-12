// Assay types with display names
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

// Ontology types (tissue types)
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

// Assay color mapping for icons
export const ASSAY_COLORS: Record<string, string> = {
  DNase: "#06da93",
  ATAC: "#02c7b9",
  H3K4me3: "#ff2020",
  ChromHMM: "#0097a7",
  H3K27ac: "#fdc401",
  CTCF: "#01a6f1",
  cCRE: "#000000",
  "RNA-seq": "#00aa00",
};

// Assay name formatting (JSON format to display format)
export const ASSAY_DISPLAY_MAP: Record<string, string> = {
  dnase: "DNase",
  atac: "ATAC",
  h3k4me3: "H3K4me3",
  h3k27ac: "H3K27ac",
  ctcf: "CTCF",
  chromhmm: "ChromHMM",
  ccre: "cCRE",
  rnaseq: "RNA-seq",
};

// Sample type options
export const SAMPLE_TYPE_OPTIONS = [
  "tissue",
  "primary cell",
  "cell line",
  "in vitro differentiated cells",
  "organoid",
];

// Life stage options
export const LIFE_STAGE_OPTIONS = ["adult", "embryonic"];
