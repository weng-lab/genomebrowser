import { z } from "zod";
import { fetchOnChange } from "../../src/data/fetchOnChange";
import { defineTrackModule } from "../../src/modules/defineTrackModule";
import { fetchTranscript } from "./fetch";
import { PackTranscript, SquishTranscript } from "./render";
import { TranscriptSettings } from "./settings";

const transcriptInputSchema = z.object({
  assembly: fetchOnChange(z.string().min(1)),
  version: fetchOnChange(z.number().int().positive()),
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
  settingsComponent: TranscriptSettings,
});
