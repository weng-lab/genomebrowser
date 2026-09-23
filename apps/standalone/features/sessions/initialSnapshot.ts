import type { AssemblyConfig } from "../browser/assembly";
import type { SessionSnapshot } from "./types";

export function createInitialSnapshot(assembly: AssemblyConfig): SessionSnapshot {
  const genes = assembly.reference.genes.find(
    ({ id }) => id === assembly.reference.defaultGeneDatasetId,
  );
  if (!genes) throw new Error("The assembly's default gene dataset is missing.");
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
      pinnedTrackIds: ["reference-ruler", `reference-annotations::${genes.id}`],
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
            id: `reference-annotations::${genes.id}`,
            title: `GENCODE ${genes.release} ${genes.variant}`,
            display: "merged",
            height: 60,
            color: "#444444",
          },
          config: { url: genes.url },
        },
      ],
    },
  };
}
