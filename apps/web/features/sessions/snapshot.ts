import { regionSchema } from "@weng-lab/contracts";
import { z } from "zod";

const highlightStyleSchema = z.strictObject({
  color: z.string().min(1),
  opacity: z.number().min(0).max(1).optional(),
  type: z.enum(["filled", "outlined"]).optional(),
});

/**
 * Serializable browser and track configuration of one session. `browser.assembly`
 * is the session's only assembly value. Runtime store state, actions, and
 * registered modules are not part of a snapshot.
 */
export const sessionSnapshotSchema = z.strictObject({
  version: z.literal(1),
  browser: z.strictObject({
    assembly: z.string().min(1),
    region: regionSchema,
    basePairDetail: z.strictObject({ maxVisibleBases: z.number().int().positive() }),
    marginWidth: z.number().positive(),
    trackWidth: z.number().positive(),
    fontSize: z.number().positive(),
    titleSize: z.number().positive(),
    highlights: z.array(
      highlightStyleSchema.extend({
        id: z.string().min(1),
        visible: z.boolean().optional(),
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
