import type { AnyTrackModule } from "@weng-lab/genomebrowser";
import type { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";
import type { AssemblyConfig } from "@/features/assemblies/assemblies";
import { collectSourceUrls } from "./sourceUrls";

type TrackType = (typeof firstPartyTrackModules)[number]["type"];
export type TrackPreviewKind = "signal" | "stranded-signal" | "ruler" | "intervals" | "genes";

type CatalogEntry = {
  label: string;
  description: string;
  preview: TrackPreviewKind;
  defaultConfig: (assembly: AssemblyConfig) => Record<string, unknown>;
  /** Only this assembly can use the track type. */
  assembly?: string;
  /** Require at least one source URL, for modules whose URLs are all optional. */
  requiresSource?: boolean;
};

const urlPlaceholder = () => ({ url: "YOUR_URL_HERE" });
const methylStrand = { cpg: { url: "" }, chg: { url: "" }, chh: { url: "" }, depth: { url: "" } };

/** Every first-party module must have an entry, so adding a module fails typechecking here. */
const catalog: Record<TrackType, CatalogEntry> = {
  ruler: {
    label: "Ruler",
    description: "Genomic coordinates and reference DNA bases from a 2bit file.",
    preview: "ruler",
    defaultConfig: (assembly) => ({ sequenceUrl: assembly.reference.sequenceUrl }),
  },
  bigwig: {
    label: "BigWig",
    description: "Continuous signal, such as coverage, accessibility, or expression.",
    preview: "signal",
    defaultConfig: urlPlaceholder,
  },
  bigbed: {
    label: "BigBed",
    description: "Genomic intervals, peaks, and annotations from a BigBed file.",
    preview: "intervals",
    defaultConfig: urlPlaceholder,
  },
  bulkbed: {
    label: "BulkBed",
    description: "Compare multiple BigBed datasets in separate rows of one track.",
    preview: "intervals",
    defaultConfig: () => ({ datasets: [{ name: "Dataset 1", url: "YOUR_URL_HERE" }] }),
  },
  cave: {
    label: "CAVE",
    description: "Developmental methylation across neuronal types and ages. Available for hg38.",
    preview: "stranded-signal",
    defaultConfig: () => ({ neurotransmitter: "GABA", age: "Infancy" }),
    assembly: "hg38",
  },
  "ccre-bigbed": {
    label: "cCRE BigBed",
    description: "Candidate cis-regulatory elements with cCRE annotations and colors.",
    preview: "intervals",
    defaultConfig: urlPlaceholder,
  },
  gene: {
    label: "Gene",
    description: "Gene models and transcripts, with exon structure and annotation tags.",
    preview: "genes",
    defaultConfig: urlPlaceholder,
  },
  methylc: {
    label: "MethylC",
    description: "Strand-specific methylation and coverage from BigWig sources.",
    preview: "stranded-signal",
    defaultConfig: () => ({ urls: { plusStrand: methylStrand, minusStrand: methylStrand } }),
    requiresSource: true,
  },
};

export function getCatalogEntry(type: string): CatalogEntry | undefined {
  return Object.hasOwn(catalog, type) ? catalog[type as TrackType] : undefined;
}

export function isAvailableForAssembly(entry: CatalogEntry, assemblyId: string) {
  return !entry.assembly || entry.assembly === assemblyId;
}

export function createCustomTrackDraft(module: AnyTrackModule, assembly: AssemblyConfig) {
  const entry = getCatalogEntry(module.type);
  if (!entry) throw new Error(`${module.type} tracks cannot be created here.`);
  return module.create({
    base: { id: crypto.randomUUID(), title: `Custom ${entry.label}` },
    source: "user",
    config: entry.defaultConfig(assembly),
  });
}

/**
 * Check the catalog's rules for a custom track. Used before saving on the client and again on
 * the server. Returns the track's source URLs.
 */
export function assertCatalogRules(
  track: { type: string; config: Record<string, unknown> },
  assemblyId: string,
) {
  const entry = getCatalogEntry(track.type);
  if (!entry) throw new Error("Choose a supported track type.");
  if (!isAvailableForAssembly(entry, assemblyId)) {
    throw new Error(`${entry.label} tracks require ${entry.assembly}.`);
  }
  const urls = collectSourceUrls(track.config);
  if (entry.requiresSource && urls.length === 0) {
    throw new Error(`Enter at least one ${entry.label} source URL.`);
  }
  return urls;
}
