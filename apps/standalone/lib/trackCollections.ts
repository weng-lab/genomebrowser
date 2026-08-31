import type { TrackSelectCollection } from "@weng-lab/genomebrowser-ui";
import biosampleTracks from "./human-biosamples.json";

const geneTracks = {
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
  tracks: [
    {
      type: "gene",
      id: "genes",
      title: "GENCODE genes",
      display: "merged",
      height: 60,
      color: "#444444",
      config: {
        url: "https://users.wenglab.org/niship/gencodefiles/human.gencode.v40.comprehensive.annotation.bb",
      },
      metadata: {},
    },
  ],
} satisfies TrackSelectCollection;

const ccreComparisonTracks = {
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
      type: "bulkbed",
      id: "aggregate-and-adipose-ccres",
      title: "Aggregate and adipose cCREs",
      display: "full",
      height: 36,
      color: "#4b9560",
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
} satisfies TrackSelectCollection;

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
    type: "cave" as const,
    id: `gaba-${age.value.toLowerCase()}`,
    title: `CAVE GABA ${age.label}`,
    color: age.color,
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
} satisfies TrackSelectCollection;

export const trackCollections = [geneTracks, ccreComparisonTracks, caveTracks, biosampleTracks];

export const defaultTrackIds = [
  "reference-annotations::genes",
  "ccre-comparisons::aggregate-and-adipose-ccres",
  "human-biosamples::ccre-aggregate",
  "human-biosamples::wgbs-ENCSR539UBP",
  "cave-development::gaba-adulthood",
] as const;
