import { bed3Schema } from "@weng-lab/genomic-reader";
import { z } from "zod";

const bed4Schema = bed3Schema.extend({ name: z.string() });
const bed5Schema = bed4Schema.extend({ score: z.coerce.number() });
const bed6Schema = bed5Schema.extend({ strand: z.string() });
const bed9Schema = bed6Schema.extend({
  thickStart: z.coerce.number(),
  thickEnd: z.coerce.number(),
  color: z
    .string()
    .regex(/^(?:0|\d{1,3},\d{1,3},\d{1,3})$/, "Expected itemRgb as 0 or R,G,B (channels 0–255)")
    .refine(
      (value) => value.split(",").every((channel) => Number(channel) <= 255),
      "Expected itemRgb channels between 0 and 255",
    )
    .transform((value) => (value === "0" ? "rgb(0,0,0)" : `rgb(${value})`)),
});

/** Positional schemas for standard BED columns and Registry cCRE BED9+1 records. */
export const bedSchemas = {
  bed3: bed3Schema,
  bed4: bed4Schema,
  bed5: bed5Schema,
  bed6: bed6Schema,
  bed9: bed9Schema,
  ccre: bed9Schema.extend({ ccreClass: z.string() }),
} as const;

export const bedSchemaKeySchema = z.enum(["bed3", "bed4", "bed5", "bed6", "bed9", "ccre"]);
export type BedSchemaKey = keyof typeof bedSchemas;
export const bedSchemaKeys = bedSchemaKeySchema.options;
