import { z } from "zod";
import { parsePublicInput } from "../../modules/schemas";
import type { TrackModule } from "../../modules/types";
import type { TranscriptConfig, TranscriptInput } from "./types";

const transcriptInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  assembly: z.string().min(1),
  version: z.number().finite().int().positive(),
  display: z.enum(["squish", "pack"]).default("squish"),
  height: z.number().positive().default(90),
  color: z.string().default("#7a4fb3"),
}).strict();

const transcriptConfigSchema = transcriptInputSchema.extend({
  type: z.literal("transcript"),
});

export function transcript(input: TranscriptInput): TranscriptConfig {
  const parsed = parsePublicInput(transcriptInputSchema, input, "Transcript config");
  return {
    ...parsed,
    type: "transcript",
  };
}

function validateTranscriptConfig(config: unknown): TranscriptConfig {
  return parsePublicInput(transcriptConfigSchema, config, "Transcript config");
}

export const transcriptModule: TrackModule<TranscriptConfig, unknown> = {
  type: "transcript",
  create: (input) => transcript(input as TranscriptInput),
  validate: validateTranscriptConfig,
  fetch: async () => {
    throw new Error("Transcript fetching is not implemented yet");
  },
  render: {},
};
