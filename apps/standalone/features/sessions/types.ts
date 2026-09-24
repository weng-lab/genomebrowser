import type { GenomicRegion } from "@weng-lab/genomebrowser";
import type { SessionSnapshot } from "@/features/session-snapshot/types";
import type { ActionResult } from "@/lib/actionResult";

/** A named session snapshot stored for one account. */
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

/** The saved session the current tab is working in. */
export type ActiveSession = Pick<SavedSession, "id" | "name" | "ownerId">;

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

export type NewSession = Pick<SavedSession, "name" | "snapshot">;
/** An update must name the revision it was based on. */
export type SessionUpdate = NewSession & Pick<SavedSession, "id" | "revision">;

export type SessionWrite = Pick<SavedSession, "id" | "revision" | "updatedAt">;
export type SaveSessionResult = ActionResult<SessionWrite>;
