import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sessionsTable } from "../../sessions/server/table";

/** Each saved session's current agent conversation. Deleting the session deletes its thread. */
export const agentThreadsTable = pgTable("agent_threads", {
  sessionId: uuid("session_id")
    .primaryKey()
    .references(() => sessionsTable.id, { onDelete: "cascade" }),
  /** The Eve session that holds the thread's messages. */
  conversationId: text("conversation_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
