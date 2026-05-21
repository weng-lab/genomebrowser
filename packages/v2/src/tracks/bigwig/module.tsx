import { z } from "zod";
import { parsePublicInput } from "../../modules/schemas";
import type { TrackModule } from "../../modules/types";
import { fetchBigWig } from "./fetch";
import { DenseBigWig, FullBigWig } from "./render";
import type { BigWigConfig, BigWigData, BigWigInput } from "./types";

const yRangeSchema = z
  .object({
    min: z.number().finite(),
    max: z.number().finite(),
  })
  .refine((range) => range.min < range.max, {
    error: "min must be less than max",
    path: ["min"],
  });

const bigWigInputSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    url: z.string().min(1),
    display: z.enum(["full", "dense"]).default("full"),
    height: z.number().positive().default(80),
    color: z.string().default("#2266aa"),
    fillWithZero: z.boolean().default(false),
    yRange: yRangeSchema.optional(),
  })
  .strict();

const bigWigConfigSchema = bigWigInputSchema.extend({
  type: z.literal("bigwig"),
});

export function bigWig(input: BigWigInput): BigWigConfig {
  const parsed = parsePublicInput(bigWigInputSchema, input, "BigWig config");
  return {
    ...parsed,
    type: "bigwig",
  };
}

function validateBigWigConfig(config: unknown): BigWigConfig {
  return parsePublicInput(bigWigConfigSchema, config, "BigWig config");
}

export const bigWigModule: TrackModule<BigWigConfig, BigWigData> = {
  type: "bigwig",
  create: (input) => bigWig(input as BigWigInput),
  validate: validateBigWigConfig,
  fetch: fetchBigWig,
  render: {
    full: FullBigWig,
    dense: DenseBigWig,
  },
};
