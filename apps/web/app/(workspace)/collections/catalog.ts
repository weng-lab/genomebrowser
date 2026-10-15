import type { TrackCollection } from "@weng-lab/genomebrowser";
import reference from "./data/reference-annotations.json";
import chromhmm from "./data/chromhmm-comparison.json";
import ccres from "./data/ccre-comparisons.json";
import cave from "./data/cave-development.json";
import biosamples from "./data/human-biosamples.json";
import rna from "./data/long-read-rna-seq.json";

const collections: TrackCollection[] = [reference, chromhmm, ccres, cave, biosamples, rna];

export const collectionSummaries = collections.map((collection) => ({
  id: collection.id,
  label: collection.label ?? collection.id,
  trackCount: collection.tracks.length,
}));
export const defaultCollectionId = reference.id;

// Called by route pages so the client receives only the selected collection's full data.
export function getTrackCollection(id: string): TrackCollection | undefined {
  return collections.find((collection) => collection.id === id);
}
