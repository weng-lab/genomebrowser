import { z } from "zod";
import type { BigBedRow } from "../bigbed/types";

export const ccreBigBedSchema = z.object({
  name: z.string(),
  score: z.coerce.number(),
  strand: z.string(),
  thickStart: z.coerce.number(),
  thickEnd: z.coerce.number(),
  color: z.string().transform((value) => `rgb(${value})`),
  ccreClass: z.string(),
});

export type CcreBigBedRow = BigBedRow & z.output<typeof ccreBigBedSchema>;
