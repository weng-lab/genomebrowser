import chromHmmTracks from "./chromhmm-comparison.json";
import {
  getGeneDatasetsForAssembly,
  getGeneDatasetTitle,
} from "@weng-lab/genomebrowser-tracks/gene";
import { browserAssembly } from "./assembly";
import type { TrackCollection } from "@weng-lab/genomebrowser";
import biosampleTracks from "./human-biosamples.json";

const geneTracks = {
  assembly: browserAssembly.id,
  id: "reference-annotations",
  label: "Reference annotations",
  description: "Reference gene annotations for the current genome assembly.",
  views: [
    {
      id: "default",
      label: "Tracks",
      columns: [{ field: "title", label: "Track" }],
      grouping: [],
      leaf: "title",
    },
  ],
  tracks: getGeneDatasetsForAssembly(browserAssembly.id).map((dataset) => ({
    base: {
      id: dataset.id,
      title: getGeneDatasetTitle(dataset),
      display: "merged",
      height: 60,
      color: "#444444",
    },
    type: "gene" as const,
    config: { url: dataset.url },
    metadata: {},
  })),
} satisfies TrackCollection;

const ccreComparisonTracks = {
  assembly: "hg38",
  id: "ccre-comparisons",
  label: "cCRE comparisons",
  description: "Compare aggregate and tissue-specific candidate cis-regulatory elements.",
  views: [
    {
      id: "default",
      label: "Tracks",
      columns: [{ field: "title", label: "Track" }],
      grouping: [],
      leaf: "title",
    },
  ],
  tracks: [
    {
      base: {
        id: "aggregate-and-adipose-ccres",
        title: "Aggregate and adipose cCREs",
        display: "full",
        height: 36,
        color: "#4b9560",
      },
      type: "bulkbed",
      config: {
        datasets: [
          {
            name: "ENCODE cCRE aggregate",
            url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed",
          },
          {
            name: "Adipose tissue cCREs",
            url: "https://downloads.wenglab.org/Registry-V4/ENCFF922YMQ.bigBed",
          },
        ],
        gap: 2,
        rowHeight: 18,
      },
      metadata: {},
    },
  ],
} satisfies TrackCollection;

const caveAges = [
  { value: "Infancy", label: "Infancy", color: "#B99768", topColor: "#EEC085" },
  {
    value: "Early_Childhood",
    label: "Early Childhood",
    color: "#B86B3A",
    topColor: "#FACB9E",
  },
  {
    value: "Late_Childhood",
    label: "Late Childhood",
    color: "#B35C2C",
    topColor: "#FCC18A",
  },
  { value: "Adolescence", label: "Adolescence", color: "#D2614D", topColor: "#F5C5BD" },
  {
    value: "Early_Adulthood",
    label: "Early Adulthood",
    color: "#9D4255",
    topColor: "#D9A1AD",
  },
  { value: "Adulthood", label: "Adulthood", color: "#593135", topColor: "#BBA0A3" },
] as const;

const caveTracks = {
  assembly: "hg38",
  id: "cave-development",
  label: "CAVE developmental methylation",
  description: "GABA hmC and OXBS tracks across six developmental ages.",
  views: [
    {
      id: "default",
      label: "Developmental age",
      columns: [{ field: "developmentalAge", label: "Developmental age" }],
      grouping: [],
      leaf: "developmentalAge",
    },
  ],
  tracks: caveAges.map((age) => ({
    base: {
      id: `gaba-${age.value.toLowerCase()}`,
      title: `CAVE GABA ${age.label}`,
      color: age.color,
    },
    type: "cave" as const,
    config: {
      neurotransmitter: "GABA" as const,
      age: age.value,
      topColor: age.topColor,
      bottomColor: age.color,
    },
    metadata: {
      developmentalAge: age.label,
    },
  })),
} satisfies TrackCollection;

const longreadRNATracks = {
  assembly: "hg38",
  id: "long-read-rna-seq",
  label: "Long-read RNA-seq BAM Tracks",
  description: "K562 long-read RNA-seq alignments on hg38.",
  views: [
    {
      id: "celltype",
      label: "Cell type",
      columns: [
        {
          field: "celltype",
          label: "Cell type",
        },
        {
          field: "experiment_accession",
          label: "Experiment accession",
        },
        {
          field: "file_accession",
          label: "File accession",
        },
      ],
      grouping: ["celltype"],
      leaf: "title",
    },
  ],
  tracks: [
    {
      type: "bam",
      base: {
        id: "ENCFF322UJU",
        title: "K562 long-read RNA-seq - ENCSR526TQU - ENCFF322UJU",
        display: "pack",
      },
      config: {
        url: "https://users.wenglab.org/niship/ENCSR526TQU.ENCFF322UJU.K562.bam",
        indexUrl: "https://users.wenglab.org/niship/ENCSR526TQU.ENCFF322UJU.K562.bam.bai",
        sequenceUrl: "https://users.wenglab.org/niship/hg38.2bit",
      },
      metadata: {
        celltype: "K562",
        file_accession: "ENCFF322UJU",
        experiment_accession: "ENCSR526TQU",
      },
    },
    {
      type: "bam",
      base: {
        id: "ENCFF504GVG",
        title: "K562 long-read RNA-seq - ENCSR589FUJ - ENCFF504GVG",
        display: "pack",
      },
      config: {
        url: "https://users.wenglab.org/niship/ENCSR589FUJ.ENCFF504GVG.K562.bam",
        indexUrl: "https://users.wenglab.org/niship/ENCSR589FUJ.ENCFF504GVG.K562.bam.bai",
        sequenceUrl: "https://users.wenglab.org/niship/hg38.2bit",
      },
      metadata: {
        celltype: "K562",
        file_accession: "ENCFF504GVG",
        experiment_accession: "ENCSR589FUJ",
      },
    },
  ],
} satisfies TrackCollection;

export const trackCollections = [
  geneTracks,
  chromHmmTracks,
  ccreComparisonTracks,
  caveTracks,
  biosampleTracks,
  longreadRNATracks,
];

export const defaultTrackIds = [
  "chromhmm-comparison::tissue-states",
  "reference-annotations::gencode-v40-comprehensive",
  "ccre-comparisons::aggregate-and-adipose-ccres",
  "human-biosamples::ccre-aggregate",
  "human-biosamples::wgbs-ENCSR539UBP",
  "cave-development::gaba-adulthood",
] as const;
