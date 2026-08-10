import type { TrackSelectCollection } from "@weng-lab/genomebrowser-ui";
import biosampleTracks from "../human-biosamples.json";

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
      type: "transcript",
      id: "genes",
      title: "GENCODE genes",
      display: "squish",
      height: 60,
      color: "#444444",
      config: {
        endpoint: "/api/screen-graphql",
        assembly: "GRCh38",
        version: 40,
      },
      metadata: {},
    },
  ],
} satisfies TrackSelectCollection;

export const trackCollections = [geneTracks, biosampleTracks];

export const defaultTrackIds = [
  "reference-annotations::genes",
  "human-biosamples::human-biosamples/ccre-aggregate",
  "human-biosamples::human-biosamples/dnase-aggregate",
  "human-biosamples::human-biosamples/h3k4me3-aggregate",
  "human-biosamples::human-biosamples/h3k27ac-aggregate",
  "human-biosamples::human-biosamples/ctcf-aggregate",
  "human-biosamples::human-biosamples/atac-aggregate",
] as const;
