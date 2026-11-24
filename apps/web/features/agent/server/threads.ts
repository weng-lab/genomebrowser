import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Identity } from "../../account/server/identity";
import { sessionIdSchema } from "../../sessions/schema";
import { sessionsTable } from "../../sessions/server/table";
import { agentThreadsTable } from "./table";

/**
 * The agent thread of each session the acting user owns. A session has at most
 * one current conversation; every operation answers as if a session another
 * user owns, or that does not exist, has no thread.
 */
export type AgentThreads = {
  /** The session's current conversation ID, or null when it has none yet. */
  current(sessionId: string): Promise<string | null>;
  /**
   * Make `conversationId` the session's thread unless it already has one.
   * Returns whether `conversationId` is now the session's thread.
   */
  bind(sessionId: string, conversationId: string): Promise<boolean>;
  /**
   * Stop the session from gaining a thread, as before it is deleted, and return
   * the conversation it has, or null when it had none. A conversation created
   * afterwards is refused like one that lost the race to another tab. Until
   * the session is deleted, `current` then names a conversation no one has,
   * which `release` clears.
   */
  close(sessionId: string): Promise<string | null>;
  /** Whether `conversationId` is the thread of a session the acting user owns. */
  owns(sessionId: string, conversationId: string): Promise<boolean>;
  /**
   * Stop treating `conversationId` as the session's thread, so the next message
   * starts a new one. Does nothing when the session has a different thread.
   */
  release(sessionId: string, conversationId: string): Promise<void>;
};

/** Starts the thread name of a session closed before it had a conversation. Eve names none this way. */
const closedPrefix = "closed:";

export function createAgentThreads({
  db,
  identity,
}: {
  db: NodePgDatabase;
  identity: Identity;
}): AgentThreads {
  /** Matches the session only when the acting user owns it; any other ID matches nothing. */
  async function owned(sessionId: string) {
    const owner = await identity.userId();
    if (!owner || !sessionIdSchema.safeParse(sessionId).success) return undefined;
    return and(eq(sessionsTable.id, sessionId), eq(sessionsTable.owner, owner));
  }

  async function current(sessionId: string) {
    const session = await owned(sessionId);
    if (!session) return null;
    const [row] = await db
      .select({ conversationId: agentThreadsTable.conversationId })
      .from(agentThreadsTable)
      .innerJoin(sessionsTable, eq(agentThreadsTable.sessionId, sessionsTable.id))
      .where(session);
    return row?.conversationId ?? null;
  }

  /**
   * Make `conversationId` the thread of the session `session` matches, unless it has one.
   * Inserting from the owned session row keeps a deleted or foreign session from
   * gaining a thread, and the conflict rule keeps the first conversation bound.
   */
  async function insert(session: SQL | undefined, conversationId: string) {
    await db
      .insert(agentThreadsTable)
      .select(
        db
          .select({
            sessionId: sessionsTable.id,
            conversationId: sql<string>`${conversationId}`.as("conversation_id"),
            createdAt: sql<Date>`now()`.as("created_at"),
          })
          .from(sessionsTable)
          .where(session),
      )
      .onConflictDoNothing();
  }

  return {
    current,

    async bind(sessionId, conversationId) {
      const session = await owned(sessionId);
      if (!session) return false;
      await insert(session, conversationId);
      return (await current(sessionId)) === conversationId;
    },

    async close(sessionId) {
      const session = await owned(sessionId);
      if (!session) return null;
      // Taking the empty slot with a name no conversation has makes every later bind lose.
      const nobody = `${closedPrefix}${randomUUID()}`;
      await insert(session, nobody);
      const conversationId = await current(sessionId);
      return conversationId?.startsWith(closedPrefix) ? null : conversationId;
    },

    async owns(sessionId, conversationId) {
      return (await current(sessionId)) === conversationId;
    },

    async release(sessionId, conversationId) {
      const session = await owned(sessionId);
      if (!session) return;
      await db
        .delete(agentThreadsTable)
        .where(
          and(
            eq(agentThreadsTable.conversationId, conversationId),
            inArray(
              agentThreadsTable.sessionId,
              db.select({ id: sessionsTable.id }).from(sessionsTable).where(session),
            ),
          ),
        );
    },
  };
}
