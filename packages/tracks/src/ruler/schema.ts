import { fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
export const rulerConfigSchema = z.object({
  sequenceUrl: fetchOnChange(z.url({ protocol: /^https?$/ }).optional()),
  sequenceMinPixelsPerBase: fetchOnChange(z.number().min(1).max(100).default(5)),
});
export type RulerConfig = z.output<typeof rulerConfigSchema>;
