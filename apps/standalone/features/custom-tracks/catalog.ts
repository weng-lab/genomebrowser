import type { AnyTrackModule } from "@weng-lab/genomebrowser";
import type { AssemblyConfig } from "../browser/assembly";

const strand = { cpg: { url: "" }, chg: { url: "" }, chh: { url: "" }, depth: { url: "" } };

export const trackCatalog: Record<
  string,
  { label: string; description: string; config: Record<string, unknown>; assembly?: string }
> = {
  ruler: {
    label: "Ruler",
    description: "Genomic coordinates and reference DNA bases from a 2bit file.",
    config: {},
  },
  bigwig: {
    label: "BigWig",
    description: "Continuous signal, such as coverage, accessibility, or expression.",
    config: { url: "YOUR_URL_HERE" },
  },
  bigbed: {
    label: "BigBed",
    description: "Genomic intervals, peaks, and annotations from a BigBed file.",
    config: { url: "YOUR_URL_HERE" },
  },
  bulkbed: {
    label: "BulkBed",
    description: "Compare multiple BigBed datasets in separate rows of one track.",
    config: { datasets: [{ name: "Dataset 1", url: "YOUR_URL_HERE" }] },
  },
  cave: {
    label: "CAVE",
    description: "Developmental methylation across neuronal types and ages. Available for hg38.",
    config: { neurotransmitter: "GABA", age: "Infancy" },
    assembly: "hg38",
  },
  "ccre-bigbed": {
    label: "cCRE BigBed",
    description: "Candidate cis-regulatory elements with cCRE annotations and colors.",
    config: { url: "YOUR_URL_HERE" },
  },
  gene: {
    label: "Gene",
    description: "Gene models and transcripts, with exon structure and annotation tags.",
    config: { url: "YOUR_URL_HERE" },
  },
  methylc: {
    label: "MethylC",
    description: "Strand-specific methylation and coverage from BigWig sources.",
    config: { urls: { plusStrand: strand, minusStrand: strand } },
  },
};

export function createCustomTrackDraft(module: AnyTrackModule, assembly: AssemblyConfig) {
  const entry = trackCatalog[module.type];
  return module.create({
    base: { id: crypto.randomUUID(), title: `Custom ${entry.label}` },
    source: "user",
    config: entry.config,
    ...(module.type === "ruler" ? { config: { sequenceUrl: assembly.reference.sequenceUrl } } : {}),
  });
}
