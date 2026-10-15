import type { AnyTrackInstance } from "@weng-lab/genomebrowser";

export type CollectionStoreTrack = {
  base: { id: string };
};

/** Match an existing runtime track to a collection-qualified ID without changing its runtime ID. */
export type TrackSelectTrackIdResolver = (track: AnyTrackInstance) => string | undefined;
