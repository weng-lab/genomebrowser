import { z } from "zod";
import { defineTrackModule } from "../../modules/defineTrackModule";
import { fetchOnChange } from "../../modules/fetchOnChange";
import { TrackTooltip } from "../shared/TrackTooltip";
import { FullCave } from "./render";
import { fetchCave } from "./fetch";
import type { CaveTooltipItem } from "./types";

const caveConfigSchema = z.object({
  neurotransmitter: fetchOnChange(z.enum(["GABA", "GLU"])),
  age: fetchOnChange(
    z.enum([
      "Infancy",
      "Early_Childhood",
      "Late_Childhood",
      "Adolescence",
      "Early_Adulthood",
      "Adulthood",
    ]),
  ),
});

export const caveModule = defineTrackModule<CaveTooltipItem>()({
  type: "cave",
  defaults: {
    height: 35,
    color: "#3333ff",
  },
  tooltipComponent: ({ item }) => (
    <TrackTooltip>
      <text fill="#000000" fontSize={12} dominantBaseline="middle">
        hmC: {formatValue(item.top)}
      </text>
      <text fill="#000000" fontSize={12} y={12} dominantBaseline="middle">
        OXBS: {formatValue(item.bottom)}
      </text>
    </TrackTooltip>
  ),
  configSchema: caveConfigSchema,
  fetch: fetchCave,
  render: {
    full: FullCave,
  },
});

function formatValue(point: CaveTooltipItem["top"]) {
  return point?.max === null || point?.max === undefined ? "n/a" : point.max.toFixed(2);
}
