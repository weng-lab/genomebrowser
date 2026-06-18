import { z } from "zod";
import { defineTrackModule } from "../../modules/defineTrackModule";
import { fetchOnChange } from "../../modules/fetchOnChange";
import { TrackTooltip } from "../shared/TrackTooltip";
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
  tooltipComponent: ({ item }) => (
    <TrackTooltip>
      <text fill="#000000" fontSize={12} dominantBaseline="middle">
        {item.name || item.id}
      </text>
    </TrackTooltip>
  ),
  schema: transcriptInputSchema,
  fetch: fetchTranscript,
  render: {
    squish: SquishTranscript,
    pack: PackTranscript,
  },
  settingsComponent: TranscriptSettings,
});
