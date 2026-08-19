import type { ModuleCreateInput, ModuleInstance } from "@weng-lab/genomebrowser";
import { defineTrackModule, fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { hexColorSchema } from "../shared/schemas";
import { fetchMethylC } from "./fetch";
import { SplitMethylC } from "./render";
import { MethylCSettings } from "./settings";
import { MethylCTooltip } from "./tooltip";
import type { MethylCTooltipItem } from "./types";

const colors = { cpg: "#648bd8", chg: "#ff944d", chh: "#ff00ff", depth: "#525252" };
const rangeSchema = z
  .object({ min: z.number(), max: z.number() })
  .refine((range) => range.min < range.max, { error: "min must be less than max", path: ["min"] });
const channelSchema = z.object({ url: fetchOnChange(z.string()) });
const strandSchema = z.object({
  cpg: channelSchema,
  chg: channelSchema,
  chh: channelSchema,
  depth: channelSchema,
});
const configSchema = z.object({
  urls: z.object({ plusStrand: strandSchema, minusStrand: strandSchema }),
  colors: z
    .object({
      cpg: hexColorSchema.default(colors.cpg),
      chg: hexColorSchema.default(colors.chg),
      chh: hexColorSchema.default(colors.chh),
      depth: hexColorSchema.default(colors.depth),
    })
    .default(colors),
  maskCpgByCoverage: z.boolean().default(false),
  range: rangeSchema.optional(),
});

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
export type MethylCConfig = ModuleInstance<typeof methylCModule>["config"];
export type {
  MethylCColors,
  MethylCData,
  MethylCDisplay,
  MethylCInteraction,
  MethylCRenderedPoint,
  MethylCShowRows,
  MethylCStrandUrls,
  MethylCTooltipItem,
  MethylCUrls,
} from "./types";
