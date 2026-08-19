import type { ModuleCreateInput, ModuleInstance } from "@weng-lab/genomebrowser";
import { defineTrackModule, fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { hexColorSchema } from "../shared/schemas";
import { fetchCave } from "./fetch";
import { FullCave } from "./render";
import { CaveSettings } from "./settings";
import { CaveTooltip } from "./tooltip";
import type { CaveTooltipItem } from "./types";

const configSchema = z.object({
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
  defaults: { height: 35, color: "#3333ff" },
  configSchema,
  fetch: fetchCave,
  render: { full: FullCave },
  settingsComponent: CaveSettings,
  tooltipComponent: CaveTooltip,
});

export type CaveCreateInput = ModuleCreateInput<typeof caveModule>;
export type CaveConfig = ModuleInstance<typeof caveModule>["config"];
export type {
  CaveAge,
  CaveData,
  CaveDisplay,
  CaveInteraction,
  CaveNeurotransmitter,
  CaveTooltipItem,
} from "./types";
