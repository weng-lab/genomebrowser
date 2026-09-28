import {
  defineTrackModule,
  type AnyTrackInstance,
  type TrackRendererProps,
} from "@weng-lab/genomebrowser";
import type { TrackSortOption } from "@weng-lab/genomebrowser-ui";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";
import { z } from "zod";

export const initialRegion = { chromosome: "chr1", start: 1_000_000, end: 1_010_000 };

export type Assay = "ATAC" | "RNA" | "WGBS";

type SampleCore = {
  sampleId: string;
  assay: Assay;
  fileType: string;
  replicate: number;
};

/** Extra metadata, derived from the track ID so values vary but stay stable across resets. */
export type SampleDetails = {
  tissue: string;
  donor: string;
  sex: string;
  ageGroup: string;
  lab: string;
  platform: string;
  biosampleType: string;
  libraryPrep: string;
  readLength: number;
  depthMillions: number;
  qcScore: number;
  collected: string;
};

export type SampleTrackInfo = SampleCore & SampleDetails;

const DETAIL_VALUES = {
  tissue: ["Liver", "Lung", "Heart", "Brain", "Kidney", "Spleen"],
  donor: ["D-101", "D-102", "D-103", "D-104"],
  sex: ["Female", "Male"],
  ageGroup: ["18-29", "30-44", "45-59", "60+"],
  lab: ["Bernstein", "Snyder", "Stam", "Weng"],
  platform: ["NovaSeq 6000", "NextSeq 2000", "HiSeq 4000"],
  biosampleType: ["Tissue", "Primary cell", "Cell line"],
  libraryPrep: ["Tn5", "TruSeq", "Nextera", "EM-seq"],
  readLength: [50, 75, 100, 150],
  depthMillions: [18, 32, 45, 60, 85],
  qcScore: [0.71, 0.82, 0.88, 0.93, 0.97],
  collected: ["2021-03-14", "2022-07-02", "2023-01-19", "2023-11-08", "2024-05-27"],
} as const;

function pick<T>(values: readonly T[], seed: number, salt: number) {
  return values[(seed * 31 + salt * 17) % values.length];
}

function describe(core: SampleCore): SampleTrackInfo {
  const seed = [...sampleTrackId(core)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return {
    ...core,
    tissue: pick(DETAIL_VALUES.tissue, seed, 1),
    donor: pick(DETAIL_VALUES.donor, seed, 2),
    sex: pick(DETAIL_VALUES.sex, seed, 3),
    ageGroup: pick(DETAIL_VALUES.ageGroup, seed, 4),
    lab: pick(DETAIL_VALUES.lab, seed, 5),
    platform: pick(DETAIL_VALUES.platform, seed, 6),
    biosampleType: pick(DETAIL_VALUES.biosampleType, seed, 7),
    libraryPrep: pick(DETAIL_VALUES.libraryPrep, seed, 8),
    readLength: pick(DETAIL_VALUES.readLength, seed, 9),
    depthMillions: pick(DETAIL_VALUES.depthMillions, seed, 10),
    qcScore: pick(DETAIL_VALUES.qcScore, seed, 11),
    collected: pick(DETAIL_VALUES.collected, seed, 12),
  };
}

// File types are assay-specific, so their display order is ranked within each assay.
const FILE_TYPES: Record<Assay, readonly string[]> = {
  ATAC: ["signal", "peaks"],
  RNA: ["signal", "junctions"],
  WGBS: ["methylation"],
};
const ASSAY_ORDER: readonly Assay[] = ["ATAC", "RNA", "WGBS"];
const ASSAY_COLORS: Record<Assay, string> = {
  ATAC: "#2563eb",
  RNA: "#16a34a",
  WGBS: "#c026d3",
};

function SampleBar({ config, color, width, height }: TrackRendererProps<{ label: string }, null>) {
  return (
    <g>
      <rect x={0} y={6} width={width} height={height - 12} rx={3} fill={color} opacity={0.18} />
      <text x={12} y={height / 2 + 4} fontSize={13} fill="#0f172a">
        {config.label}
      </text>
    </g>
  );
}

const sampleModule = defineTrackModule({
  type: "sort-harness-sample",
  configSchema: z.object({ label: z.string() }),
  defaults: { height: 36, color: "#64748b" },
  fetch: async () => null,
  render: { full: SampleBar },
});

export const harnessModules = [rulerModule, sampleModule] as const;

export function sampleTrackId({ sampleId, assay, fileType, replicate }: SampleCore) {
  return `${sampleId}-${assay}-${fileType}-r${replicate}`;
}

export function createSampleTrack(info: SampleTrackInfo) {
  const id = sampleTrackId(info);
  return sampleModule.create({
    base: { id, title: id, color: ASSAY_COLORS[info.assay] },
    config: {
      label: `${info.sampleId} · ${info.assay} · ${info.fileType} · rep ${info.replicate}`,
    },
  });
}

const initialSampleCores: SampleCore[] = [
  { sampleId: "S02", assay: "RNA", fileType: "signal", replicate: 1 },
  { sampleId: "S01", assay: "ATAC", fileType: "peaks", replicate: 2 },
  { sampleId: "S03", assay: "WGBS", fileType: "methylation", replicate: 1 },
  { sampleId: "S01", assay: "RNA", fileType: "signal", replicate: 1 },
  { sampleId: "S02", assay: "ATAC", fileType: "signal", replicate: 2 },
  { sampleId: "S03", assay: "ATAC", fileType: "signal", replicate: 1 },
  { sampleId: "S01", assay: "ATAC", fileType: "signal", replicate: 1 },
  { sampleId: "S02", assay: "RNA", fileType: "junctions", replicate: 2 },
  { sampleId: "S03", assay: "RNA", fileType: "signal", replicate: 2 },
];
const initialSampleInfo = initialSampleCores.map(describe);
const pinnedInfo = describe({
  sampleId: "S02",
  assay: "WGBS",
  fileType: "methylation",
  replicate: 1,
});

export const pinnableTrackId = sampleTrackId(initialSampleInfo[6]);
export const initialPinnedTrackIds = [sampleTrackId(pinnedInfo)];

export function createInitialInfo() {
  return new Map(
    [pinnedInfo, ...initialSampleInfo].map((info) => [sampleTrackId(info), info] as const),
  );
}

/** Ruler first, an undescribed track mid-list, and one pinned sample track. */
export function createInitialTracks(): AnyTrackInstance[] {
  const samples = initialSampleInfo.map(createSampleTrack);
  return [
    createSampleTrack(pinnedInfo),
    rulerModule.create({ base: { id: "ruler", title: "Coordinates" }, config: {} }),
    ...samples.slice(0, 4),
    sampleModule.create({
      base: { id: "unannotated", title: "Unannotated" },
      config: { label: "No metadata: getMetadata returns undefined" },
    }),
    ...samples.slice(4),
  ];
}

/** Cycles through samples, assays, and file types so each added track differs. */
export function nextSampleInfo(count: number): SampleTrackInfo {
  const assay = ASSAY_ORDER[count % ASSAY_ORDER.length];
  const fileTypes = FILE_TYPES[assay];
  return describe({
    sampleId: `S0${(count % 5) + 1}`,
    assay,
    fileType: fileTypes[count % fileTypes.length],
    replicate: 3 + count,
  });
}

function compareByFileType(a: SampleTrackInfo, b: SampleTrackInfo) {
  return (
    ASSAY_ORDER.indexOf(a.assay) - ASSAY_ORDER.indexOf(b.assay) ||
    FILE_TYPES[a.assay].indexOf(a.fileType) - FILE_TYPES[b.assay].indexOf(b.fileType)
  );
}

export const baseSortOptions: TrackSortOption<SampleTrackInfo>[] = [
  { id: "sampleId", label: "Sample ID", compare: (a, b) => a.sampleId.localeCompare(b.sampleId) },
  {
    id: "assay",
    label: "Assay",
    compare: (a, b) => ASSAY_ORDER.indexOf(a.assay) - ASSAY_ORDER.indexOf(b.assay),
  },
  { id: "fileType", label: "File Type", compare: compareByFileType },
];

export const replicateSortOption: TrackSortOption<SampleTrackInfo> = {
  id: "replicate",
  label: "Replicate",
  compare: (a, b) => a.replicate - b.replicate,
};

type DetailField = keyof SampleDetails;

function detailOption(
  id: DetailField,
  label: string,
  direction: 1 | -1 = 1,
): TrackSortOption<SampleTrackInfo> {
  return {
    id,
    label,
    compare: (a, b) => {
      const left = a[id];
      const right = b[id];
      const comparison =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right));
      return comparison * direction;
    },
  };
}

/** A long option list for checking how the dialog handles many criteria. */
export const detailSortOptions: TrackSortOption<SampleTrackInfo>[] = [
  detailOption("tissue", "Tissue"),
  detailOption("donor", "Donor"),
  detailOption("sex", "Sex"),
  detailOption("ageGroup", "Age group"),
  detailOption("lab", "Lab"),
  detailOption("platform", "Sequencing platform"),
  detailOption("biosampleType", "Biosample type"),
  detailOption("libraryPrep", "Library prep"),
  detailOption("readLength", "Read length"),
  detailOption("depthMillions", "Sequencing depth (highest first)", -1),
  detailOption("qcScore", "QC score (highest first)", -1),
  detailOption("collected", "Collection date"),
];

export const detailColumns: { field: DetailField; label: string }[] = [
  { field: "tissue", label: "Tissue" },
  { field: "donor", label: "Donor" },
  { field: "sex", label: "Sex" },
  { field: "ageGroup", label: "Age" },
  { field: "lab", label: "Lab" },
  { field: "platform", label: "Platform" },
  { field: "biosampleType", label: "Biosample" },
  { field: "libraryPrep", label: "Library" },
  { field: "readLength", label: "Read len" },
  { field: "depthMillions", label: "Depth (M)" },
  { field: "qcScore", label: "QC" },
  { field: "collected", label: "Collected" },
];
