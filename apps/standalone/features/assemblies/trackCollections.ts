import type { TrackCollection } from "@weng-lab/genomebrowser";
import { getGeneDatasetTitle } from "@weng-lab/genomebrowser-tracks/gene";
import { referenceCollectionId, referenceGeneTrackBase, type AssemblyConfig } from "./assemblies";
import humanBiosamples from "./collections/human-biosamples.json";

// Kept apart from the assembly registry so server code does not load collection JSON.
const providedCollections: Record<string, readonly TrackCollection[]> = {
  hg38: [humanBiosamples],
};

function getReferenceCollection(assembly: AssemblyConfig): TrackCollection {
  return {
    assembly: assembly.definition.id,
    id: referenceCollectionId,
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
      base: { id: dataset.id, title: getGeneDatasetTitle(dataset), ...referenceGeneTrackBase },
      type: "gene" as const,
      config: { url: dataset.url },
      metadata: {},
    })),
  };
}

export function getTrackCollections(assembly: AssemblyConfig): TrackCollection[] {
  return [getReferenceCollection(assembly), ...(providedCollections[assembly.definition.id] ?? [])];
}
