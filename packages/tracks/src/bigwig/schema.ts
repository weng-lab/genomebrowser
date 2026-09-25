import { fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { hexColorSchema } from "../shared/schemas";

const yRangeSchema = z
  .object({ min: z.number().optional(), max: z.number().optional() })
  .refine((range) => range.min === undefined || range.max === undefined || range.min < range.max, {
    error: "min must be less than max",
    path: ["min"],
  });
export const configSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  fillWithZero: z.boolean().default(false),
  yRange: yRangeSchema.optional(),
  showClampIndicators: z.boolean().default(true),
  clampIndicatorColor: hexColorSchema.default("#ff0000"),
});
