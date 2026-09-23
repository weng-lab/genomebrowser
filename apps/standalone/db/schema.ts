import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { SessionSnapshot } from "../features/sessions/types";

export const sessions = pgTable(
  "sessions",
  {
    ownerId: text("owner_id").notNull(),
    id: uuid("id").defaultRandom().notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    snapshotVersion: integer("snapshot_version").notNull(),
    browserState: jsonb("browser_state").$type<SessionSnapshot["browser"]>().notNull(),
    trackState: jsonb("track_state").$type<SessionSnapshot["trackStore"]>().notNull(),
    revision: integer("revision").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.ownerId, table.id] }),
    index("sessions_owner_updated_idx").on(table.ownerId, table.updatedAt.desc()),
    check("sessions_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("sessions_revision_positive", sql`${table.revision} > 0`),
    check("sessions_snapshot_version", sql`${table.snapshotVersion} = 1`),
  ],
);

export const customTracks = pgTable(
  "custom_tracks",
  {
    ownerId: text("owner_id").notNull(),
    id: uuid("id").notNull(),
    assemblyId: text("assembly_id").notNull(),
    track: jsonb("track").$type<SessionSnapshot["trackStore"]["tracks"][number]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.ownerId, table.id] }),
    index("custom_tracks_owner_assembly_idx").on(table.ownerId, table.assemblyId),
  ],
);
