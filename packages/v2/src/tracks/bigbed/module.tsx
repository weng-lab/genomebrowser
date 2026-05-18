import { z } from "zod";
import { parsePublicInput } from "../../modules/schemas";
import type { TrackModule } from "../../modules/types";
import type { BigBedConfig, BigBedInput } from "./types";

const bigBedInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().min(1),
  display: z.enum(["dense", "squish"]).default("dense"),
  height: z.number().positive().default(60),
  color: z.string().default("#4b9560"),
}).strict();

const bigBedConfigSchema = bigBedInputSchema.extend({
  type: z.literal("bigbed"),
});

export function bigBed(input: BigBedInput): BigBedConfig {
  const parsed = parsePublicInput(bigBedInputSchema, input, "BigBed config");
  return {
    ...parsed,
    type: "bigbed",
  };
}

function validateBigBedConfig(config: unknown): BigBedConfig {
  return parsePublicInput(bigBedConfigSchema, config, "BigBed config");
}

export const bigBedModule: TrackModule<BigBedConfig, unknown> = {
  type: "bigbed",
  create: (input) => bigBed(input as BigBedInput),
  validate: validateBigBedConfig,
  fetch: async () => {
    throw new Error("BigBed fetching is not implemented yet");
  },
  render: {},
};
