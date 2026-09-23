import "server-only";
import { and, count, desc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { getDatabase } from "../../db/client";
import { sessions } from "../../db/schema";
import { parseSessionSnapshot } from "./validation";
import type { SaveSessionInput, SavedSession, SessionSummary } from "./types";

export class SessionWriteError extends Error {}

const savedFields = { id: sessions.id, revision: sessions.revision, updatedAt: sessions.updatedAt };

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
    async save(ownerId: string, input: SaveSessionInput) {
      const row = await database.transaction(async (transaction) => {
        const state = {
          name: input.name,
          snapshotVersion: input.snapshot.version,
          browserState: input.snapshot.browser,
          trackState: input.snapshot.trackStore,
        };
        if (input.id === undefined) {
          // Serialize creation for this owner so concurrent requests cannot exceed the limit.
          await transaction.execute(
            sql`select pg_advisory_xact_lock(hashtextextended(${ownerId}, 0))`,
          );
          const [total] = await transaction
            .select({ value: count() })
            .from(sessions)
            .where(eq(sessions.ownerId, ownerId));
          if (total.value >= 5)
            throw new SessionWriteError(
              "You can save up to five sessions. Delete a session from the dashboard first.",
            );
          const [created] = await transaction
            .insert(sessions)
            .values({ ownerId, ...state })
            .returning(savedFields);
          return created;
        }
        const ownerAndId = and(eq(sessions.ownerId, ownerId), eq(sessions.id, input.id));
        const [existing] = await transaction
          .select()
          .from(sessions)
          .where(ownerAndId)
          .for("update");
        if (!existing) throw new SessionWriteError("This session is no longer available.");
        if (existing.revision !== input.revision)
          throw new SessionWriteError(
            "This session changed in another tab. Reload it before saving again.",
          );
        if (existing.browserState.assembly.id !== input.snapshot.browser.assembly.id) {
          throw new SessionWriteError("A session's assembly cannot be changed.");
        }
        const [updated] = await transaction
          .update(sessions)
          .set({
            ...state,
            revision: existing.revision + 1,
            updatedAt: new Date(),
          })
          .where(ownerAndId)
          .returning(savedFields);
        return updated;
      });
      return { ...row, updatedAt: row.updatedAt.toISOString() };
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
