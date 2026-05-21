import { z } from "zod";
import { defineTrackModule } from "../../modules/defineTrackModule";
import type { TrackRendererProps } from "../../modules/types";
import type { BigBedConfig } from "./types";

const bigBedInputSchema = z.object({
  url: z.string().min(1),
});

export const bigBedModule = defineTrackModule({
  type: "bigbed",
  defaults: {
    height: 60,
    color: "#4b9560",
  },
  schema: bigBedInputSchema,
  fetch: async () => {
    throw new Error("BigBed fetching is not implemented yet");
  },
  render: {
    dense: BigBedPlaceholder,
    squish: BigBedPlaceholder,
  },
});

function BigBedPlaceholder({ width, height }: TrackRendererProps<BigBedConfig, unknown>) {
  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" />
      <text x={8} y={Math.min(18, height / 2)} fill="#555555" fontSize="12px">
        BigBed rendering is not implemented yet
      </text>
    </g>
  );
}
