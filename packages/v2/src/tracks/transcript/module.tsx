import { z } from "zod";
import { defineTrackModule } from "../../modules/defineTrackModule";
import type { TrackRendererProps } from "../../modules/types";
import type { TranscriptConfig } from "./types";

const transcriptInputSchema = z.object({
  assembly: z.string().min(1),
  version: z.number().int().positive(),
});

export const transcriptModule = defineTrackModule({
  type: "transcript",
  defaults: {
    height: 90,
    color: "#7a4fb3",
  },
  schema: transcriptInputSchema,
  fetch: async () => {
    throw new Error("Transcript fetching is not implemented yet");
  },
  render: {
    squish: TranscriptPlaceholder,
    pack: TranscriptPlaceholder,
  },
});

function TranscriptPlaceholder({
  width,
  height,
}: TrackRendererProps<TranscriptConfig, unknown>) {
  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" />
      <text x={8} y={Math.min(18, height / 2)} fill="#555555" fontSize="12px">
        Transcript rendering is not implemented yet
      </text>
    </g>
  );
}
