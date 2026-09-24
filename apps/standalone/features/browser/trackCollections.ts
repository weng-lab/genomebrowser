import { getGeneDatasetTitle } from "@weng-lab/genomebrowser-tracks/gene";
import type { AssemblyConfig } from "./assembly";
import type { TrackCollection } from "@weng-lab/genomebrowser";
import biosampleTracks from "./human-biosamples.json";

function getGeneTracks(assembly: AssemblyConfig): TrackCollection {
  return {
    assembly: assembly.definition.id,
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
    tracks: assembly.reference.genes.map((dataset) => ({
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
}

export function getTrackCollections(assembly: AssemblyConfig) {
  return [getGeneTracks(assembly), biosampleTracks].filter(
    (collection) =>
      collection.assembly === assembly.definition.id &&
      assembly.collectionIds.includes(collection.id),
  );
}
