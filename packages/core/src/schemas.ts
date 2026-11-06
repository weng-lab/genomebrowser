import { z } from "zod";

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, "Expected a six-digit hexadecimal color in #RRGGBB format");

/** Who supplied a track: the embedding application or the person using the browser. */
export const trackSourceSchema = z.enum(["host", "user"]);

export const trackBaseSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  display: z.string().min(1),
  height: z.number().positive(),
  color: hexColorSchema,
});

/** Base values a track gets when neither its input nor its module supplies them. */
export const trackBaseDefaults = { height: 80, color: "#000000" } as const;

export const highlightSchema = z.object({
  id: z.string().min(1),
  region: z
    .object({
      chromosome: z.string().min(1).optional(),
      start: z.number().int(),
      end: z.number().int(),
    })
    .refine((region) => region.start < region.end, {
      message: "start must be less than end",
      path: ["start"],
    }),
  color: z.string().min(1),
  opacity: z.number().min(0).max(1).optional(),
  type: z.enum(["filled", "outlined"]).optional(),
});

export const selectionModeSchema = z.enum(["pan", "zoom", "highlight"]);
export const selectionHighlightSchema = highlightSchema.pick({
  color: true,
  opacity: true,
  type: true,
});

export const basePairDetailSchema = z.strictObject({
  maxVisibleBases: z.number().int().positive(),
});

/** Serializable browser settings besides the assembly and region. */
export const browserSettingsSchema = z.object({
  basePairDetail: basePairDetailSchema,
  marginWidth: z.number().positive(),
  trackWidth: z.number().positive(),
  fontSize: z.number().positive(),
  titleSize: z.number().positive(),
  highlights: z.array(highlightSchema),
  selectionMode: selectionModeSchema,
  selectionHighlight: selectionHighlightSchema,
});
