import { fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
export const rulerConfigSchema = z.object({
  sequenceHighlightColor: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .default("#64748b"),
  distinguishMaskedBases: z.boolean().default(false),
  sequenceUrl: fetchOnChange(z.url({ protocol: /^https?$/ }).optional()),
});
export type RulerConfig = z.output<typeof rulerConfigSchema>;
