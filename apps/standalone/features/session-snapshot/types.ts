import type { BrowserStore, TrackBase, TrackSource } from "@weng-lab/genomebrowser";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** One track's configuration without its module, callbacks, or fetched data. */
export type SerializedTrack = {
  type: string;
  base: TrackBase;
  config: { [key: string]: JsonValue };
  source: TrackSource;
};

/** Serializable browser and track store state. Guests and saved sessions share this shape. */
export type SessionSnapshot = {
  version: 1;
  browser: Pick<
    BrowserStore,
    | "assembly"
    | "region"
    | "highlights"
    | "marginWidth"
    | "trackWidth"
    | "fontSize"
    | "titleSize"
    | "selectionHighlight"
  >;
  trackStore: {
    // Array order is display order, matching the track store's ordered tracks.
    tracks: SerializedTrack[];
    pinnedTrackIds: string[];
  };
};
