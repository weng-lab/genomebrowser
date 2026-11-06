import { fetchOnChange } from "@weng-lab/genomebrowser";
import { hexColorSchema } from "@weng-lab/genomebrowser/schemas";
import { z } from "zod";
export const configSchema = z.object({
  sequenceHighlightColor: hexColorSchema.default("#64748b"),
  distinguishMaskedBases: z.boolean().default(false),
  sequenceUrl: fetchOnChange(z.url({ protocol: /^https?$/ }).optional()),
});
export type RulerConfig = z.output<typeof configSchema>;
