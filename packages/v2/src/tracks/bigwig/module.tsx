import { z } from "zod";
import { defineTrackModule } from "../../modules/defineTrackModule";
import { fetchBigWig } from "./fetch";
import { DenseBigWig, FullBigWig } from "./render";
import { BigWigSettings } from "./settings";

const yRangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
  })
  .refine((range) => range.min < range.max, {
    error: "min must be less than max",
    path: ["min"],
  });

const bigWigConfigSchema = z.object({
  url: z.string().min(1),
  fillWithZero: z.boolean().default(false),
  yRange: yRangeSchema.optional(),
});

export const bigWigModule = defineTrackModule({
  type: "bigwig",
  defaults: {
    height: 80,
    color: "#2266aa",
  },
  schema: bigWigConfigSchema,
  fetch: fetchBigWig,
  render: {
    full: FullBigWig,
    dense: DenseBigWig,
  },
  settingsComponent: BigWigSettings,
});
