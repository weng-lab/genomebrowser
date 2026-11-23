import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sessionsTable } from "../../sessions/server/table";

/**
 * Each saved session's agent thread: its current conversation and the summary
 * carried from earlier ones. Deleting the session deletes its thread.
 */
export const agentThreadsTable = pgTable("agent_threads", {
  sessionId: uuid("session_id")
    .primaryKey()
    .references(() => sessionsTable.id, { onDelete: "cascade" }),
  /** The Eve session that holds the current thread's messages, or null until the next message starts one. */
  conversationId: text("conversation_id").unique(),
  /** What the agent carries from earlier threads of this session. */
  summary: text(),
  /** When a message was last sent in the current thread; a long gap rolls the thread over. */
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
