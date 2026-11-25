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
   * Replace the name and snapshot at an exact revision (`PUT`). Recognizes a
   * retry of the immediately preceding save ID, and never recreates a deleted session.
   */
  update(id: string, input: SessionUpdate): Promise<Session>;
  /**
   * Commit a conditional update (`PATCH` / domain mutation), recognizing any
   * `saveId` still in the session's recent save-ID history even after intervening
   * writes. Returns `applied: false` when `saveId` was already applied.
   */
  commit(id: string, input: SessionUpdate): Promise<{ session: SavedSession; applied: boolean }>;
  remove(id: string): Promise<void>;
  /** Succeeds when the acting user owns the session, without loading it. */
  authorize(id: string): Promise<void>;
};

export const maxRecentSaveIds = 128;

const metadata = {
  id: sessionsTable.id,
  name: sessionsTable.name,
  createdAt: sessionsTable.createdAt,
  updatedAt: sessionsTable.updatedAt,
  revision: sessionsTable.revision,
  // Read in the database so listing sessions does not send their snapshots.
  assembly: sql<string>`${sessionsTable.snapshot}->'browser'->>'assembly'`,
  trackCount: sql<number>`jsonb_array_length(${sessionsTable.snapshot}->'tracks')`.mapWith(Number),
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

  async function writeUpdate(
    id: string,
    input: SessionUpdate,
    { allowInterveningRetry }: { allowInterveningRetry: boolean },
  ): Promise<{ session: SavedSession; applied: boolean }> {
    const owner = await actingUser();
    const { name, snapshot, revision, saveId } = parseSessionUpdate(input);
    // One statement checks the revision, stored assembly, and recent save IDs
    // atomically, so concurrent writes and retries cannot interleave.
    const [updated] = await db
      .update(sessionsTable)
      .set({
        name,
        snapshot,
        revision: sql`${sessionsTable.revision} + 1`,
        // Dual-write `save_id` during expand-and-contract rollout for older deployments.
        saveId,
        recentSaveIds: sql`(array_append(${sessionsTable.recentSaveIds}, ${saveId}::uuid))[greatest(1, cardinality(${sessionsTable.recentSaveIds}) + 2 - ${maxRecentSaveIds}):]`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          owned(owner, id),
          eq(sessionsTable.revision, revision),
          sql`${sessionsTable.snapshot}->'browser'->>'assembly' = ${snapshot.browser.assembly}`,
          sql`NOT (${saveId}::uuid = ANY(${sessionsTable.recentSaveIds}))`,
        ),
      )
      .returning(metadata);
    if (updated) return { session: { ...updated, snapshot }, applied: true };

    // Nothing was written. Any state read now is one the update could have met.
    const [existing] = await db
      .select({
        ...metadata,
        snapshot: sessionsTable.snapshot,
        recentSaveIds: sessionsTable.recentSaveIds,
      })
      .from(sessionsTable)
      .where(owned(owner, id));
    if (!existing) throw notFound();
    const { recentSaveIds, snapshot: existingSnapshot, ...meta } = existing;
    const isDuplicate = allowInterveningRetry
      ? recentSaveIds.includes(saveId)
      : recentSaveIds.at(-1) === saveId && meta.revision === revision + 1;
    if (isDuplicate) {
      return {
        session: { ...meta, snapshot: sessionSnapshotSchema.parse(existingSnapshot) },
        applied: false,
      };
    }
    if (meta.assembly !== snapshot.browser.assembly) {
      throw new SessionError(
        "ASSEMBLY_CHANGED",
        "A session's assembly cannot change; create a new session instead",
      );
    }
    throw new SessionError(
      "CONFLICT",
      "This session was saved elsewhere since these changes were based on it",
    );
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
      const { session } = await writeUpdate(id, input, { allowInterveningRetry: false });
      const { snapshot: _snapshot, ...meta } = session;
      return meta;
    },

    commit(id, input) {
      return writeUpdate(id, input, { allowInterveningRetry: true });
    },

    async remove(id) {
      const owner = await actingUser();
      const removed = await db
        .delete(sessionsTable)
        .where(owned(owner, id))
        .returning({ id: sessionsTable.id });
      if (removed.length === 0) throw notFound();
    },

    async authorize(id) {
      const owner = await actingUser();
      const [session] = await db
        .select({ id: sessionsTable.id })
        .from(sessionsTable)
        .where(owned(owner, id));
      if (!session) throw notFound();
    },
  };
}

function notFound() {
  return new SessionError("NOT_FOUND", "Session not found");
}
