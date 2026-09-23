import type { BrowserStore, GenomicRegion, TrackBase, TrackSource } from "@weng-lab/genomebrowser";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// Persist configured data only. Modules, actions, callbacks, and fetched data stay in memory.
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
    tracks: {
      type: string;
      base: TrackBase;
      config: { [key: string]: JsonValue };
      source: TrackSource;
    }[];
    pinnedTrackIds: string[];
  };
};

export type SavedSession = {
  id: string;
  ownerId: string;
  name: string;
  revision: number;
  /** ISO 8601 timestamps supplied by the database. */
  createdAt: string;
  updatedAt: string;
  snapshot: SessionSnapshot;
};

// Dashboard queries do not need source URLs or the full store snapshot.
export type SessionSummary = Pick<SavedSession, "id" | "name" | "createdAt" | "updatedAt"> & {
  assemblyId: string;
  region: GenomicRegion;
  trackCount: number;
};

export type SessionListResult =
  | { status: "ready"; sessions: SessionSummary[] }
  | { status: "storage-unavailable" }
  | { status: "error" };

export type SaveSessionInput = {
  name: string;
  snapshot: SessionSnapshot;
} & ({ id?: never; revision?: never } | { id: string; revision: number });

export type SaveSessionResult =
  | { ok: true; id: string; revision: number; updatedAt: string }
  | { ok: false; error: string; retryable?: boolean };
