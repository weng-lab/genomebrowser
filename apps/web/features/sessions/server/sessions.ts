import "server-only";
import { sessionSnapshotSchema } from "../snapshot.ts";
import { and, asc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import {
  sessionIdSchema,
  sessionInputSchema,
  sessionUpdateSchema,
  type SavedSession,
  type Session,
  type SessionErrorCode,
  type SessionInput,
  type SessionUpdate,
} from "../schema";
import type { Identity } from "../../account/server/identity";
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

function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw new SessionError("INVALID_INPUT", z.prettifyError(result.error));
  return result.data;
}

/** Validate a session's name and snapshot, failing with `INVALID_INPUT`. */
export const parseSessionInput = (input: unknown) => parse(sessionInputSchema, input);
/** Validate an update's name, snapshot, base revision, and save ID, failing with `INVALID_INPUT`. */
export const parseSessionUpdate = (input: unknown) => parse(sessionUpdateSchema, input);

/**
 * Saved sessions of the acting user. Every operation resolves the user from
 * the injected identity; another user's session is reported as `NOT_FOUND`.
 */
export type Sessions = {
  create(input: SessionInput): Promise<Session>;
  /** Metadata only, alphabetically by name. */
  list(): Promise<Session[]>;
  load(id: string): Promise<SavedSession>;
  /**
   * Replace the name and snapshot of an existing session at `input.revision`,
   * advancing its revision. Never recreates a deleted one. Fails with `CONFLICT`
   * when the session is at another revision, unless `input.saveId` produced its
   * current revision: that update already applied, and its result is returned
   * without applying it again.
   */
  update(id: string, input: SessionUpdate): Promise<Session>;
  remove(id: string): Promise<void>;
};

const metadata = {
  id: sessionsTable.id,
  name: sessionsTable.name,
  createdAt: sessionsTable.createdAt,
  updatedAt: sessionsTable.updatedAt,
  revision: sessionsTable.revision,
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
      const { name, snapshot, revision, saveId } = parseSessionUpdate(input);
      // One statement checks the revision and stored assembly and records the
      // save ID, so concurrent writes cannot interleave between them.
      const [updated] = await db
        .update(sessionsTable)
        .set({
          name,
          snapshot,
          revision: sql`${sessionsTable.revision} + 1`,
          saveId,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            owned(owner, id),
            eq(sessionsTable.revision, revision),
            sql`${sessionsTable.snapshot}->'browser'->>'assembly' = ${snapshot.browser.assembly}`,
          ),
        )
        .returning(metadata);
      if (updated) return updated;
      // Nothing was written. Any state read now is one the update could have met.
      const [existing] = await db
        .select({
          ...metadata,
          saveId: sessionsTable.saveId,
          assembly: sql<string>`${sessionsTable.snapshot}->'browser'->>'assembly'`,
        })
        .from(sessionsTable)
        .where(owned(owner, id));
      if (!existing) throw notFound();
      const { saveId: lastSaveId, assembly, ...session } = existing;
      if (lastSaveId === saveId && session.revision === revision + 1) return session;
      if (assembly !== snapshot.browser.assembly) {
        throw new SessionError(
          "ASSEMBLY_CHANGED",
          "A session's assembly cannot change; create a new session instead",
        );
      }
      throw new SessionError(
        "CONFLICT",
        "This session was saved elsewhere since these changes were based on it",
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
