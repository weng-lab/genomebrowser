import type { SessionSnapshot } from "../sessions/types";

export type CustomTrack = {
  assemblyId: string;
  track: SessionSnapshot["trackStore"]["tracks"][number];
};

export type CustomTracksResult =
  | { status: "ready"; tracks: CustomTrack[] }
  | { status: "signed-out" | "storage-unavailable" | "error" };

export type SaveCustomTrackResult = { ok: true; entry: CustomTrack } | { ok: false; error: string };
