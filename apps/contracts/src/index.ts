import { z } from "zod";

export const regionSchema = z
  .strictObject({
    chromosome: z.string(),
    start: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    end: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  })
  .refine((region) => region.end > region.start, "end must exceed start");

/**
 * What agents and the app agree on for one command: its MCP tool name and
 * description, and the shapes of its parameters and successful result. How the
 * app executes it is not part of the contract.
 */
export type CommandContract = {
  /** MCP tool name, in snake_case. */
  name: string;
  /** Shown to agents. Say what the command does and how to fill in its parameters. */
  description: string;
  params: z.ZodObject;
  result: z.ZodObject;
};

export const setRegion = {
  name: "set_region",
  description:
    "Move the genome browser to a region. Coordinates are zero-based and half-open; the browser clamps them to the chromosome. Returns the region shown and whether it was clamped.",
  params: z.strictObject({ region: regionSchema }),
  result: z.strictObject({ region: regionSchema, clamped: z.boolean() }),
} as const satisfies CommandContract;

/** Every command. Each becomes an MCP tool, and the app must implement each one. */
export const commands = [setRegion] as const;

export type Command = (typeof commands)[number];

/**
 * Selects the browser tab that receives a tool call. The app connects each tab
 * under its open session's ID. The MCP server only routes by it.
 */
export const sessionIdSchema = z.string().regex(/^[\w-]{1,64}$/, "Invalid session ID");

/** A command delivered to a tab. The tab looks up `name` and validates `params`. */
export const commandMessageSchema = z.strictObject({
  commandId: z.uuid(),
  name: z.string(),
  params: z.unknown(),
  expiresAt: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

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
