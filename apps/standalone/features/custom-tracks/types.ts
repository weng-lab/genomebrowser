import type { SerializedTrack } from "@/features/session-snapshot/types";
import type { ActionResult } from "@/lib/actionResult";

/** A user-owned track saved to the account's custom collection for one assembly. */
export type CustomTrack = {
  assemblyId: string;
  track: SerializedTrack;
};

export type CustomTracksResult =
  | { status: "ready"; tracks: CustomTrack[] }
  | { status: "signed-out" | "storage-unavailable" | "error" };

export type SaveCustomTrackResult = ActionResult<{ entry: CustomTrack }>;
