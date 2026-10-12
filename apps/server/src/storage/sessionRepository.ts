import type { SessionSnapshot } from "../protocol.ts";

/** One shared browser session; storage adapters own durable reads and writes. */
export type SessionRepository = {
  load(): Promise<SessionSnapshot | null>;
  save(snapshot: SessionSnapshot): Promise<void>;
};
