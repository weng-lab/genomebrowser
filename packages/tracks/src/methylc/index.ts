import { configSchema } from "./schema";
import type { ModuleCreateInput } from "@weng-lab/genomebrowser";
import { defineTrackModule } from "@weng-lab/genomebrowser";
import { fetchMethylC } from "./fetch";
import { SplitMethylC } from "./render";
import { MethylCSettings } from "./settings";
import { MethylCTooltip } from "./tooltip";
import type { MethylCTooltipItem } from "./types";

export const methylCModule = defineTrackModule<MethylCTooltipItem>()({
  type: "methylc",
  defaults: { height: 100 },
  configSchema,
  fetch: fetchMethylC,
  render: { split: SplitMethylC },
  settingsComponent: MethylCSettings,
  tooltipComponent: MethylCTooltip,
});

export type MethylCCreateInput = ModuleCreateInput<typeof methylCModule>;
export type { MethylCData, MethylCInteraction, MethylCShowRows, MethylCTooltipItem } from "./types";

export type MethylCDisplay = (typeof methylCModule)["displays"][number];
export type { MethylCConfig, MethylCColors, MethylCUrls, MethylCStrandUrls } from "./schema";
