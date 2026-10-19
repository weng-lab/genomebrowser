import "server-only";
import { sessionSnapshotSchema } from "../../sessions/snapshot.ts";
import { and, asc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import {
  sessionIdSchema,
  sessionInputSchema,
  type SavedSession,
  type Session,
  type SessionErrorCode,
  type SessionInput,
} from "../../sessions/schema";
import type { Identity } from "../identity";
import { sessionsTable } from "./table";

export class SessionError extends Error {
  constructor(
    readonly code: SessionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SessionError";
  }
}

/** Validate a session's name and snapshot, failing with `INVALID_INPUT`. */
export function parseSessionInput(input: unknown) {
  const result = sessionInputSchema.safeParse(input);
  if (!result.success) throw new SessionError("INVALID_INPUT", z.prettifyError(result.error));
  return result.data;
}

/**
 * Saved sessions of the acting user. Every operation resolves the user from
 * the injected identity; another user's session is reported as `NOT_FOUND`.
 */
export type Sessions = {
  create(input: SessionInput): Promise<Session>;
  /** Metadata only, alphabetically by name. */
  list(): Promise<Session[]>;
  load(id: string): Promise<SavedSession>;
  /** Replace the name and snapshot of an existing session. Never recreates a deleted one. */
  update(id: string, input: SessionInput): Promise<Session>;
  remove(id: string): Promise<void>;
};

const metadata = {
  id: sessionsTable.id,
  name: sessionsTable.name,
  createdAt: sessionsTable.createdAt,
  updatedAt: sessionsTable.updatedAt,
};

export function createSessions({
  db,
  identity,
}: {
  db: NodePgDatabase;
  identity: Identity;
}): Sessions {
  async function actingUser() {
    const userId = await identity.userId();
    if (!userId) throw new SessionError("UNAUTHENTICATED", "Sign in to use saved sessions");
    return userId;
  }

  function owned(owner: string, id: string) {
    // Only database-generated UUIDs name sessions; any other ID matches nothing.
    if (!sessionIdSchema.safeParse(id).success) throw notFound();
    return and(eq(sessionsTable.id, id), eq(sessionsTable.owner, owner));
  }

  return {
    async create(input) {
      const owner = await actingUser();
      const { name, snapshot } = parseSessionInput(input);
      const [created] = await db
        .insert(sessionsTable)
        .values({ owner, name, snapshot })
        .returning(metadata);
      return created;
    },

    async list() {
      const owner = await actingUser();
      return db
        .select(metadata)
        .from(sessionsTable)
        .where(eq(sessionsTable.owner, owner))
        .orderBy(asc(sessionsTable.name), asc(sessionsTable.createdAt));
    },

    async load(id) {
      const owner = await actingUser();
      const [saved] = await db
        .select({ ...metadata, snapshot: sessionsTable.snapshot })
        .from(sessionsTable)
        .where(owned(owner, id));
      if (!saved) throw notFound();
      return { ...saved, snapshot: sessionSnapshotSchema.parse(saved.snapshot) };
    },

    async update(id, input) {
      const owner = await actingUser();
      const { name, snapshot } = parseSessionInput(input);
      // Checking the stored assembly in the same statement keeps concurrent writes from changing it.
      const [updated] = await db
        .update(sessionsTable)
        .set({ name, snapshot, updatedAt: sql`now()` })
        .where(
          and(
            owned(owner, id),
            sql`${sessionsTable.snapshot}->'browser'->>'assembly' = ${snapshot.browser.assembly}`,
          ),
        )
        .returning(metadata);
      if (updated) return updated;
      const [existing] = await db
        .select({ id: sessionsTable.id })
        .from(sessionsTable)
        .where(owned(owner, id));
      if (!existing) throw notFound();
      throw new SessionError(
        "ASSEMBLY_CHANGED",
        "A session's assembly cannot change; create a new session instead",
      );
    },

    async remove(id) {
      const owner = await actingUser();
      const removed = await db
        .delete(sessionsTable)
        .where(owned(owner, id))
        .returning({ id: sessionsTable.id });
      if (removed.length === 0) throw notFound();
    },
  };
}

function notFound() {
  return new SessionError("NOT_FOUND", "Session not found");
}
