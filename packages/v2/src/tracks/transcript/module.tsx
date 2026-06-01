import { z } from "zod";
import { defineTrackModule } from "../../modules/defineTrackModule";
import { fetchTranscript } from "./fetch";
import { PackTranscript, SquishTranscript } from "./render";

const transcriptInputSchema = z.object({
  assembly: z.string().min(1),
  version: z.number().int().positive(),
  geneName: z.string().optional(),
  canonicalColor: z.string().optional(),
  highlightColor: z.string().optional(),
});

export const transcriptModule = defineTrackModule({
  type: "transcript",
  defaults: {
    height: 90,
    color: "#7a4fb3",
  },
  schema: transcriptInputSchema,
  fetch: fetchTranscript,
  render: {
    squish: SquishTranscript,
    pack: PackTranscript,
  },
});
