import { z } from "zod";
import { defineTrackModule } from "../../modules/defineTrackModule";
import { fetchOnChange } from "../../modules/fetchOnChange";
import { hexColorSchema } from "../../modules/schemas";
import { TrackTooltip } from "../shared/TrackTooltip";
import { FullCave } from "./render";
import { fetchCave } from "./fetch";
import { CaveSettings } from "./settings";
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
  topColor: hexColorSchema.default("#000000"),
  bottomColor: hexColorSchema.default("#000000"),
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
  settingsComponent: CaveSettings,
});

function formatValue(point: CaveTooltipItem["top"]) {
  return point?.max === null || point?.max === undefined ? "No data" : point.max.toFixed(2);
}
