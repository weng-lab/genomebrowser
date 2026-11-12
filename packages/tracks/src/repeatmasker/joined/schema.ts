import type { RepeatMaskerConfig } from "../schema";
import { z } from "zod";

const unsignedInteger = z.coerce.number().int().min(0).max(0xffff_ffff);
const signedList = z
  .string()
  .transform((value) => (value === "" ? [] : value.replace(/,$/, "").split(",")))
  .pipe(
    z.array(
      z
        .string()
        .regex(/^-?\d+$/)
        .transform(Number)
        .pipe(z.number().int().safe()),
    ),
  );

// Ordered columns after BED3. Column nine is reserved, not a repeat-class color.
export const bigRmskSchema = z.object({
  name: z.string(),
  score: unsignedInteger,
  strand: z.enum(["+", "-"]),
  thickStart: unsignedInteger,
  thickEnd: unsignedInteger,
  reserved: unsignedInteger,
  blockCount: unsignedInteger,
  blockSizes: signedList,
  blockStarts: signedList,
  id: unsignedInteger,
  description: z.string(),
});

export type BigRmskConfig = Pick<
  RepeatMaskerConfig,
  "rowHeight" | "showLabels" | "showUnalignedExtents"
> & { url: string };
