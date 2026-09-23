import "server-only";
import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { getDatabase } from "../../db/client";
import { customTracks } from "../../db/schema";
import type { CustomTrack } from "./types";

export function createCustomTrackRepository(database: NodePgDatabase) {
  return {
    async listByOwner(ownerId: string): Promise<CustomTrack[]> {
      return database
        .select({ assemblyId: customTracks.assemblyId, track: customTracks.track })
        .from(customTracks)
        .where(eq(customTracks.ownerId, ownerId))
        .orderBy(desc(customTracks.createdAt), customTracks.id);
    },
    async save(ownerId: string, entry: CustomTrack): Promise<CustomTrack> {
      // A retry after a lost response returns the original saved entry.
      await database
        .insert(customTracks)
        .values({
          ownerId,
          id: entry.track.base.id,
          ...entry,
        })
        .onConflictDoNothing();
      const [saved] = await database
        .select({ assemblyId: customTracks.assemblyId, track: customTracks.track })
        .from(customTracks)
        .where(and(eq(customTracks.ownerId, ownerId), eq(customTracks.id, entry.track.base.id)));
      return saved;
    },
  };
}

export async function getCustomTrackRepository() {
  const database = await getDatabase();
  return database ? createCustomTrackRepository(database) : null;
}
