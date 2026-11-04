import { z } from "zod";

/** A zero-based, half-open genomic region, as sessions save it and agent commands send it. */
export const regionSchema = z
  .strictObject({
    chromosome: z.string(),
    start: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    end: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  })
  .refine((region) => region.end > region.start, "end must exceed start");
