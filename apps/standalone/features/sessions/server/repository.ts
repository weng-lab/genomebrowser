import "server-only";
import { and, count, desc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { getDatabase } from "@/db/client";
import { sessions } from "@/db/schema";
import { parseSessionSnapshot } from "@/features/session-snapshot/parseSnapshot";
import { SESSION_LIMIT } from "../rules";
import type {
  NewSession,
  SavedSession,
  SessionSummary,
  SessionUpdate,
  SessionWrite,
} from "../types";

/** A write the user can resolve, such as a stale revision. Its message is user-facing. */
export class SessionWriteError extends Error {}

const writtenFields = {
  id: sessions.id,
  revision: sessions.revision,
  updatedAt: sessions.updatedAt,
};

function stateColumns({ name, snapshot }: NewSession) {
  return {
    name,
    snapshotVersion: snapshot.version,
    browserState: snapshot.browser,
    trackState: snapshot.trackStore,
  };
}

function toSessionWrite(row: { id: string; revision: number; updatedAt: Date }): SessionWrite {
  return { ...row, updatedAt: row.updatedAt.toISOString() };
}

export function createSessionRepository(database: NodePgDatabase) {
  return {
    async listByOwner(ownerId: string): Promise<SessionSummary[]> {
      const rows = await database
        .select({
          id: sessions.id,
          name: sessions.name,
          createdAt: sessions.createdAt,
          updatedAt: sessions.updatedAt,
          assemblyId: sql<string>`${sessions.browserState}->'assembly'->>'id'`,
          region: sql<SessionSummary["region"]>`${sessions.browserState}->'region'`,
          trackCount: sql<number>`jsonb_array_length(${sessions.trackState}->'tracks')`,
        })
        .from(sessions)
        .where(eq(sessions.ownerId, ownerId))
        .orderBy(desc(sessions.updatedAt), sessions.id);
      return rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));
    },

    async getByOwner(ownerId: string, id: string): Promise<SavedSession | null> {
      const [row] = await database
        .select()
        .from(sessions)
        .where(and(eq(sessions.ownerId, ownerId), eq(sessions.id, id)));
      if (!row) return null;
      return {
        id: row.id,
        ownerId: row.ownerId,
        name: row.name,
        revision: row.revision,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        snapshot: parseSessionSnapshot({
          version: row.snapshotVersion,
          browser: row.browserState,
          trackStore: row.trackState,
        }),
      };
    },

    async create(ownerId: string, session: NewSession): Promise<SessionWrite> {
      const row = await database.transaction(async (transaction) => {
        // Serialize creation for this owner so concurrent requests cannot exceed the limit.
        await transaction.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${ownerId}, 0))`,
        );
        const [total] = await transaction
          .select({ value: count() })
          .from(sessions)
          .where(eq(sessions.ownerId, ownerId));
        if (total.value >= SESSION_LIMIT) {
          throw new SessionWriteError(
            `You can save up to ${SESSION_LIMIT} sessions. Delete a session from the dashboard first.`,
          );
        }
        const [created] = await transaction
          .insert(sessions)
          .values({ ownerId, ...stateColumns(session) })
          .returning(writtenFields);
        return created;
      });
      return toSessionWrite(row);
    },

    async update(ownerId: string, update: SessionUpdate): Promise<SessionWrite> {
      const row = await database.transaction(async (transaction) => {
        const ownerAndId = and(eq(sessions.ownerId, ownerId), eq(sessions.id, update.id));
        const [existing] = await transaction
          .select()
          .from(sessions)
          .where(ownerAndId)
          .for("update");
        if (!existing) throw new SessionWriteError("This session is no longer available.");
        if (existing.revision !== update.revision) {
          throw new SessionWriteError(
            "This session changed in another tab. Reload it before saving again.",
          );
        }
        if (existing.browserState.assembly.id !== update.snapshot.browser.assembly.id) {
          throw new SessionWriteError("A session's assembly cannot be changed.");
        }
        const [updated] = await transaction
          .update(sessions)
          .set({ ...stateColumns(update), revision: existing.revision + 1, updatedAt: new Date() })
          .where(ownerAndId)
          .returning(writtenFields);
        return updated;
      });
      return toSessionWrite(row);
    },

    async deleteByOwner(ownerId: string, id: string) {
      const rows = await database
        .delete(sessions)
        .where(and(eq(sessions.ownerId, ownerId), eq(sessions.id, id)))
        .returning({ id: sessions.id });
      return rows.length > 0;
    },
  };
}

export async function getSessionRepository() {
  const database = await getDatabase();
  return database ? createSessionRepository(database) : null;
}
