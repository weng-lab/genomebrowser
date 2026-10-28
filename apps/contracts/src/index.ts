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

const imageFormatSchema = z.enum(["svg", "png"]);

export const exportImage = {
  name: "export_image",
  description:
    "Export the genome browser's current view as one image and show it to the user in a preview with a Download button. The image is not returned to you; the user decides whether to download it. Fails while tracks are loading or when the browser page is not open. Returns the file name and size in pixels.",
  params: z.strictObject({
    format: imageFormatSchema
      .default("svg")
      .describe("svg for publications and editing, png for slides and documents."),
    scale: z
      .number()
      .min(1)
      .max(3)
      .default(2)
      .describe(
        "PNG pixels per screen pixel: 1 screen, 2 high resolution, 3 print. SVG ignores it.",
      ),
    includeTitles: z.boolean().default(true).describe("Show each track's name above it."),
    includeRuler: z.boolean().default(true).describe("Include coordinate ruler tracks."),
    filename: z
      .string()
      .max(180)
      .optional()
      .describe("File name without extension. Omit to name it after the region."),
  }),
  result: z.strictObject({
    filename: z.string(),
    format: imageFormatSchema,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
} as const satisfies CommandContract;

/** Every command. Each becomes an MCP tool, and the app must implement each one. */
export const commands = [setRegion, exportImage] as const;

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
