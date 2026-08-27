import type { TrackSelectCollection } from "@weng-lab/genomebrowser-ui";
import sourceCollection from "./human-biosamples.json";

type HumanBiosampleTrack = (typeof sourceCollection.tracks)[number];

function getTitleStem(track: HumanBiosampleTrack) {
  return `${track.metadata.displayName}, ${track.metadata.assay}`;
}

function getTrackIdentifier(track: HumanBiosampleTrack) {
  return (
    track.metadata.fileAccession ||
    track.metadata.experimentAccession ||
    track.metadata.sourceId ||
    track.id
  );
}

const titleStemCounts = sourceCollection.tracks.reduce((counts, track) => {
  const titleStem = getTitleStem(track);
  counts.set(titleStem, (counts.get(titleStem) ?? 0) + 1);
  return counts;
}, new Map<string, number>());

export const humanBiosampleCollection = {
  ...sourceCollection,
  tracks: sourceCollection.tracks.map((track) => {
    const titleStem = getTitleStem(track);
    const identifier = titleStemCounts.get(titleStem) === 1 ? "" : `, ${getTrackIdentifier(track)}`;

    return {
      ...track,
      title: `${titleStem}${identifier} (${track.display})`,
    };
  }),
} satisfies TrackSelectCollection;
