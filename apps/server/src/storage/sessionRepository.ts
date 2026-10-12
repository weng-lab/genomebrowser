import type { SessionSnapshot } from "../protocol.ts";

/** Saved browser sessions by ID; storage adapters own durable reads and writes. */
export type SessionRepository = {
  load(id: string): Promise<SessionSnapshot | null>;
  save(id: string, snapshot: SessionSnapshot): Promise<void>;
};
