import { sessionSnapshotSchema } from "./snapshot.ts";
import { z } from "zod";

/** Saved sessions are named by database-generated UUIDs. */
export const sessionIdSchema = z.uuid();

/** What a client creates or saves. The server derives the owner; requests cannot name one. */
export const sessionInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(200),
  snapshot: sessionSnapshotSchema,
});
export type SessionInput = z.input<typeof sessionInputSchema>;

/** Saved session metadata. The owner stays on the server. */
export const sessionSchema = z.strictObject({
  id: sessionIdSchema,
  name: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Session = z.infer<typeof sessionSchema>;

export const savedSessionSchema = sessionSchema.extend({ snapshot: sessionSnapshotSchema });
export type SavedSession = z.infer<typeof savedSessionSchema>;

export const sessionErrorCodeSchema = z.enum([
  "INVALID_INPUT",
  "UNAUTHENTICATED",
  "NOT_FOUND",
  "ASSEMBLY_CHANGED",
]);
export type SessionErrorCode = z.infer<typeof sessionErrorCodeSchema>;

/** The body of a rejected session request. Server failures have no code. */
export const sessionErrorSchema = z.object({ code: sessionErrorCodeSchema, message: z.string() });

/** Largest accepted request body, in bytes. */
export const maxSessionBytes = 1_000_000;
