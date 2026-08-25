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
      display: "squish",
      height: 60,
      color: "#444444",
      config: {
        url: "http://127.0.0.1:8765/gencode.v40.basic.annotation.bb",
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

export const trackCollections = [geneTracks, ccreComparisonTracks, biosampleTracks];

export const defaultTrackIds = [
  "reference-annotations::genes",
  "ccre-comparisons::aggregate-and-adipose-ccres",
  "human-biosamples::ccre-aggregate",
  "human-biosamples::dnase-aggregate",
  "human-biosamples::h3k4me3-aggregate",
  "human-biosamples::h3k27ac-aggregate",
  "human-biosamples::ctcf-aggregate",
  "human-biosamples::atac-aggregate",
] as const;
