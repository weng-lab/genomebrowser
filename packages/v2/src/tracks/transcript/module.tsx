import { z } from "zod";
import { defineTrackModule } from "../../modules/defineTrackModule";
import { fetchOnChange } from "../../modules/fetchOnChange";
import { defaultScreenGraphQlEndpoint } from "../../screen";
import { TrackTooltip } from "../shared/TrackTooltip";
import { fetchTranscript } from "./fetch";
import { PackTranscript, SquishTranscript } from "./render";
import { TranscriptSettings } from "./settings";
import type { Transcript } from "./types";

const transcriptInputSchema = z.object({
  endpoint: fetchOnChange(z.string().trim().min(1).default(defaultScreenGraphQlEndpoint)),
  assembly: fetchOnChange(z.string().min(1)),
  version: fetchOnChange(z.number().int().positive()),
  geneName: z.string().optional(),
  canonicalColor: z.string().optional(),
  highlightColor: z.string().optional(),
});

export const transcriptModule = defineTrackModule<Transcript>()({
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
  configSchema: transcriptInputSchema,
  fetch: fetchTranscript,
  render: {
    squish: SquishTranscript,
    pack: PackTranscript,
  },
  settingsComponent: TranscriptSettings,
});
