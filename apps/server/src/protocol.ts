import { sessionSnapshotSchema } from "@weng-lab/session-snapshot";
import { z } from "zod";

export const sessionIdSchema = z.string().regex(/^[\w-]{1,64}$/, "Invalid session ID");

export const sessionListSchema = z.array(sessionIdSchema);

/** A command sent to the tab over SSE. The tab looks up `name` and validates `params`. */
export const commandMessageSchema = z.strictObject({
  commandId: z.uuid(),
  name: z.string(),
  params: z.unknown(),
  expiresAt: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

/** Every command returns the whole session state on success. */
export const commandResultSchema = z.discriminatedUnion("ok", [
  z.strictObject({ ok: z.literal(true), state: sessionSnapshotSchema }),
  z.strictObject({ ok: z.literal(false), code: z.string(), error: z.string() }),
]);
export const commandReplySchema = z.strictObject({
  commandId: z.uuid(),
  result: commandResultSchema,
});
export type CommandMessage = z.infer<typeof commandMessageSchema>;
export type CommandResult = z.infer<typeof commandResultSchema>;
export type CommandReply = z.infer<typeof commandReplySchema>;
