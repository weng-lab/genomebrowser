import { z } from "zod";
import { defineTrackModule } from "../../modules/defineTrackModule";
import { fetchOnChange } from "../../modules/fetchOnChange";
import { TrackTooltip } from "../shared/TrackTooltip";
import { fetchBigBed } from "./fetch";
import { DenseBigBed, SquishBigBed } from "./render";
import { BigBedSettings } from "./settings";

const bigBedInputSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  schema: z.instanceof(z.ZodObject).optional(),
});

export const bigBedModule = defineTrackModule({
  type: "bigbed",
  defaults: {
    height: 60,
    color: "#4b9560",
  },
  tooltipComponent: ({ item }) => (
    <TrackTooltip>
      <text fill="#000000" fontSize={12} dominantBaseline="middle">
        {item.name || `${item.start}-${item.end}`}
      </text>
    </TrackTooltip>
  ),
  schema: bigBedInputSchema,
  fetch: fetchBigBed,
  render: {
    dense: DenseBigBed,
    squish: SquishBigBed,
  },
  settingsComponent: BigBedSettings,
});
