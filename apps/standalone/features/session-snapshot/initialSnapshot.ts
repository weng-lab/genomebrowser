import {
  referenceCollectionId,
  referenceGeneTrackBase,
  type AssemblyConfig,
} from "@/features/assemblies/assemblies";
import type { SessionSnapshot } from "./types";

/** Guests and new sessions start with the reference ruler and default gene track pinned. */
export function createInitialSnapshot(assembly: AssemblyConfig): SessionSnapshot {
  const genes = assembly.reference.genes.find(
    ({ id }) => id === assembly.reference.defaultGeneDatasetId,
  );
  if (!genes) throw new Error("The assembly's default gene dataset is missing.");
  const geneTrackId = `${referenceCollectionId}::${genes.id}`;
  return {
    version: 1,
    browser: {
      assembly: assembly.definition,
      region: assembly.initialRegion,
      highlights: [],
      marginWidth: 50,
      trackWidth: 1000,
      fontSize: 10,
      titleSize: 12,
      selectionHighlight: { color: "#f59e0b", opacity: 0.25, type: "filled" },
    },
    trackStore: {
      pinnedTrackIds: ["reference-ruler", geneTrackId],
      tracks: [
        {
          type: "ruler",
          source: "host",
          base: {
            id: "reference-ruler",
            title: `Reference · ${assembly.definition.id}`,
            display: "full",
            height: 22,
            color: "#475569",
          },
          config: assembly.reference.sequenceUrl
            ? { sequenceUrl: assembly.reference.sequenceUrl }
            : {},
        },
        {
          type: "gene",
          source: "host",
          base: {
            id: geneTrackId,
            title: `GENCODE ${genes.release} ${genes.variant}`,
            ...referenceGeneTrackBase,
          },
          config: { url: genes.url },
        },
      ],
    },
  };
}
