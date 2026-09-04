import defaultTrackCollection from "../collections/default-tracks.json";

export const trackCollections = [defaultTrackCollection];

// Use collection-id::track-id. These tracks load at startup and when Reset is chosen.
export const defaultTrackIds = [
  "default-tracks::genes",
  "default-tracks::ccre-aggregate",
  "default-tracks::dnase-aggregate",
];
