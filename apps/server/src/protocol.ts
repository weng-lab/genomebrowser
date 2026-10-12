import { z } from "zod";

export const regionSchema = z
  .strictObject({
    chromosome: z.string(),
    start: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    end: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  })
  .refine((region) => region.end > region.start, "end must exceed start");

export const regionResultSchema = z.discriminatedUnion("ok", [
  z.strictObject({ ok: z.literal(true), region: regionSchema, clamped: z.boolean() }),
  z.strictObject({
    ok: z.literal(false),
    code: z.enum([
      "INVALID_REGION",
      "UNKNOWN_CHROMOSOME",
      "INVALID_COORDINATE",
      "REVERSED_REGION",
      "ZERO_WIDTH_REGION",
      "OUTSIDE_CHROMOSOME",
      "INVALID_ZOOM_FACTOR",
      "INVALID_ZOOM_CENTER",
    ]),
    error: z.string(),
  }),
]);
const highlightStyleSchema = z.strictObject({
  color: z.string().min(1),
  opacity: z.number().min(0).max(1).optional(),
  type: z.enum(["filled", "outlined"]).optional(),
});
export const sessionSnapshotSchema = z.strictObject({
  version: z.literal(1),
  browser: z.strictObject({
    assembly: z.literal("hg38"),
    region: regionSchema,
    basePairDetail: z.strictObject({ maxVisibleBases: z.number().int().positive() }),
    marginWidth: z.number().positive(),
    trackWidth: z.number().positive(),
    fontSize: z.number().positive(),
    titleSize: z.number().positive(),
    highlights: z.array(
      highlightStyleSchema.extend({
        id: z.string().min(1),
        region: z
          .strictObject({
            chromosome: z.string().min(1).optional(),
            start: z.number().int(),
            end: z.number().int(),
          })
          .refine((region) => region.end > region.start, "end must exceed start"),
      }),
    ),
    selectionMode: z.enum(["pan", "zoom", "highlight"]),
    selectionHighlight: highlightStyleSchema,
  }),
  tracks: z.array(
    z.strictObject({
      type: z.string().min(1),
      base: z.strictObject({
        id: z.string().min(1),
        title: z.string().min(1),
        display: z.string().min(1),
        height: z.number().positive(),
        color: z.string().regex(/^#[0-9a-f]{6}$/i),
      }),
      config: z.record(z.string(), z.json()),
      source: z.enum(["host", "user"]),
    }),
  ),
  pinnedTrackIds: z.array(z.string().min(1)),
});
export type SessionSnapshot = z.infer<typeof sessionSnapshotSchema>;

export const connectedEventSchema = z.strictObject({
  clientId: z.uuid(),
  snapshot: sessionSnapshotSchema.nullable(),
});
export const browserCommandSchema = z.strictObject({
  commandId: z.uuid(),
  type: z.literal("region.set"),
  expiresAt: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  region: regionSchema,
});
export const commandReplySchema = z.strictObject({
  commandId: z.uuid(),
  result: regionResultSchema,
});
export type Region = z.infer<typeof regionSchema>;
export type RegionResult = z.infer<typeof regionResultSchema>;
export type ConnectedEvent = z.infer<typeof connectedEventSchema>;
export type BrowserCommand = z.infer<typeof browserCommandSchema>;
export type CommandReply = z.infer<typeof commandReplySchema>;
