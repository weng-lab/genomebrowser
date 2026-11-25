import type { SessionSnapshot } from "../snapshot.ts";
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const sessionsTable = pgTable(
  "sessions",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Clerk user ID. */
    owner: text().notNull(),
    name: text().notNull(),
    /** `snapshot.browser.assembly` is the session's assembly, fixed at creation. */
    snapshot: jsonb().$type<SessionSnapshot>().notNull(),
    /** Starts at 1 and increases by one with each saved update. */
    revision: integer().notNull().default(1),
    /**
     * Bounded history of client-chosen save IDs applied to this session (newest last,
     * capped at 128), so retried writes are recognized even after intervening writes.
     */
    recentSaveIds: uuid("recent_save_ids").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_owner_idx").on(table.owner)],
);
