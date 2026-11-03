import { z } from "zod";

/** A command delivered to a tab. The tab looks up `name` and validates `params`. */
export const commandMessageSchema = z.strictObject({
  commandId: z.uuid(),
  name: z.string(),
  params: z.unknown(),
  expiresAt: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

/** Stops a delivered command whose dispatch was cancelled, if it is still running. */
export const commandCancelSchema = z.strictObject({ commandId: z.uuid() });

/** A command's outcome. On success, `value` matches the command's `result` schema. */
export const commandResultSchema = z.discriminatedUnion("ok", [
  z.strictObject({ ok: z.literal(true), value: z.json() }),
  z.strictObject({ ok: z.literal(false), code: z.string(), error: z.string() }),
]);

/** A tab's reply to a delivered command. */
export const commandReplySchema = z.strictObject({
  commandId: z.uuid(),
  result: commandResultSchema,
});

export type CommandMessage = z.infer<typeof commandMessageSchema>;
export type CommandResult = z.infer<typeof commandResultSchema>;
export type CommandReply = z.infer<typeof commandReplySchema>;
