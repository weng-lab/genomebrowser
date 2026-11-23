import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Identity } from "../../account/server/identity";
import { sessionIdSchema } from "../../sessions/schema";
import { sessionsTable } from "../../sessions/server/table";
import { agentThreadsTable } from "./table";

/** How long a thread may go without a message before it rolls over, when its session's panel next opens. */
const idleMs = () => (Number(process.env.GB_AGENT_THREAD_IDLE_MINUTES) || 180) * 60_000;

export type AgentThreadState = {
  /** The current conversation, or null when the next message starts one. */
  conversationId: string | null;
  /** Whether the current conversation has been idle long enough to roll over. */
  idle: boolean;
  /** What the agent carries from earlier threads, or null before the first rollover. */
  summary: string | null;
};

/**
 * The agent thread of each session the acting user owns. A session has at most
 * one current conversation; every operation answers as if a session another
 * user owns, or that does not exist, has no thread.
 */
export type AgentThreads = {
  read(sessionId: string): Promise<AgentThreadState>;
  /**
   * Make `conversationId` the session's current conversation unless it already
   * has one. Returns whether `conversationId` is now the current conversation.
   */
  bind(sessionId: string, conversationId: string): Promise<boolean>;
  /** Whether `conversationId` is the current conversation of a session the acting user owns. */
  owns(sessionId: string, conversationId: string): Promise<boolean>;
  /** Record a message in `conversationId`, so the thread is not idle. */
  touch(sessionId: string, conversationId: string): Promise<void>;
  /**
   * End `conversationId` as the session's current conversation, so the next
   * message starts a new one, and keep `summary` when given. Returns false,
   * changing nothing, when the session's current conversation is another.
   */
  rollOver(sessionId: string, conversationId: string, summary?: string): Promise<boolean>;
};

const none: AgentThreadState = { conversationId: null, idle: false, summary: null };

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

  /** The thread row of an owned session, or undefined. */
  async function row(sessionId: string) {
    const session = await owned(sessionId);
    if (!session) return undefined;
    const [thread] = await db
      .select({
        conversationId: agentThreadsTable.conversationId,
        summary: agentThreadsTable.summary,
        lastActiveAt: agentThreadsTable.lastActiveAt,
      })
      .from(agentThreadsTable)
      .innerJoin(sessionsTable, eq(agentThreadsTable.sessionId, sessionsTable.id))
      .where(session);
    return thread;
  }

  /** Change the thread of an owned session while `conversationId` is its current conversation. */
  async function whileCurrent(
    sessionId: string,
    conversationId: string,
    set: Partial<typeof agentThreadsTable.$inferInsert>,
  ) {
    if (!(await owned(sessionId))) return false;
    const updated = await db
      .update(agentThreadsTable)
      .set(set)
      .where(
        and(
          eq(agentThreadsTable.sessionId, sessionId),
          eq(agentThreadsTable.conversationId, conversationId),
        ),
      )
      .returning({ sessionId: agentThreadsTable.sessionId });
    return updated.length > 0;
  }

  return {
    async read(sessionId) {
      const thread = await row(sessionId);
      if (!thread) return none;
      const idle = Date.now() - thread.lastActiveAt.getTime() >= idleMs();
      return {
        conversationId: thread.conversationId,
        idle: thread.conversationId !== null && idle,
        summary: thread.summary,
      };
    },

    async bind(sessionId, conversationId) {
      const session = await owned(sessionId);
      if (!session) return false;
      // Inserting from the owned session row keeps a deleted or foreign session from
      // gaining a thread. An existing thread takes the conversation only while it has none.
      await db
        .insert(agentThreadsTable)
        .select(
          db
            .select({
              sessionId: sessionsTable.id,
              conversationId: sql<string>`${conversationId}`.as("conversation_id"),
              summary: sql<null>`null`.as("summary"),
              lastActiveAt: sql<Date>`now()`.as("last_active_at"),
              createdAt: sql<Date>`now()`.as("created_at"),
            })
            .from(sessionsTable)
            .where(session),
        )
        .onConflictDoUpdate({
          target: agentThreadsTable.sessionId,
          set: { conversationId, lastActiveAt: new Date() },
          setWhere: isNull(agentThreadsTable.conversationId),
        });
      return (await row(sessionId))?.conversationId === conversationId;
    },

    async owns(sessionId, conversationId) {
      return (await row(sessionId))?.conversationId === conversationId;
    },

    async touch(sessionId, conversationId) {
      await whileCurrent(sessionId, conversationId, { lastActiveAt: new Date() });
    },

    rollOver(sessionId, conversationId, summary) {
      return whileCurrent(sessionId, conversationId, {
        conversationId: null,
        ...(summary !== undefined && { summary }),
      });
    },
  };
}
