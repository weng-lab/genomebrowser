import { z } from "zod";
import { defineTrackModule } from "../../modules/defineTrackModule";
import { fetchOnChange } from "../../modules/fetchOnChange";
import { hexColorSchema } from "../../modules/schemas";
import { fetchMethylC } from "./fetch";
import { SplitMethylC } from "./render";
import { MethylCTooltip } from "./tooltip";
import type { MethylCTooltipItem } from "./types";

const defaultMethylCColors = {
  cpg: "#648bd8",
  chg: "#ff944d",
  chh: "#ff00ff",
  depth: "#525252",
};

const yRangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
  })
  .refine((range) => range.min < range.max, {
    error: "min must be less than max",
    path: ["min"],
  });

const channelSchema = z.object({
  url: fetchOnChange(z.string()),
});

const strandUrlsSchema = z.object({
  cpg: channelSchema,
  chg: channelSchema,
  chh: channelSchema,
  depth: channelSchema,
});

const methylCConfigSchema = z.object({
  urls: z.object({
    plusStrand: strandUrlsSchema,
    minusStrand: strandUrlsSchema,
  }),
  colors: z
    .object({
      cpg: hexColorSchema.default(defaultMethylCColors.cpg),
      chg: hexColorSchema.default(defaultMethylCColors.chg),
      chh: hexColorSchema.default(defaultMethylCColors.chh),
      depth: hexColorSchema.default(defaultMethylCColors.depth),
    })
    .default(defaultMethylCColors),
  maskCpgByCoverage: z.boolean().default(false),
  range: yRangeSchema.optional(),
});

export const methylCModule = defineTrackModule<MethylCTooltipItem>()({
  type: "methylc",
  defaults: {
    height: 100,
  },
  tooltipComponent: MethylCTooltip,
  configSchema: methylCConfigSchema,
  fetch: fetchMethylC,
  render: {
    split: SplitMethylC,
  },
});
