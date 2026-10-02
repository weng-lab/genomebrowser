import { fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { hexColorSchema } from "../shared/schemas";

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
export const configSchema = z.object({
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

export type MethylCConfig = z.output<typeof configSchema>;
export type MethylCColors = MethylCConfig["colors"];
export type MethylCUrls = MethylCConfig["urls"];
export type MethylCStrandUrls = MethylCUrls["plusStrand"];
