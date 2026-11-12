import { fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { rowHeightSchema } from "../shared/layout/rowLayout";
import type { StandardRepeatMaskerConfig } from "./standard/schema";
import type { BigRmskConfig } from "./joined/schema";

export const configSchema = z.object({
  sources: fetchOnChange(z.object({ standard: z.string().min(1), joined: z.string().min(1) })),
  view: fetchOnChange(z.enum(["standard", "joined"]).default("standard")),
  rowHeight: rowHeightSchema.default(24),
  showLabels: z.boolean().default(true),
  showStrandArrows: z.boolean().default(true),
  highlightClassOnHover: z.boolean().default(true),
  showUnalignedExtents: z.boolean().default(true),
  maxDetailBases: fetchOnChange(z.number().int().positive().default(1_000_000)),
});
export type RepeatMaskerConfig = z.output<typeof configSchema>;

export function standardConfig(config: RepeatMaskerConfig): StandardRepeatMaskerConfig {
  return {
    url: config.sources.standard,
    rowHeight: config.rowHeight,
    showLabels: config.showLabels,
    maxDetailBases: config.maxDetailBases,
    highlightClassOnHover: config.highlightClassOnHover,
  };
}
export function joinedConfig(config: RepeatMaskerConfig): BigRmskConfig {
  return {
    url: config.sources.joined,
    rowHeight: config.rowHeight,
    showLabels: config.showLabels,
    showUnalignedExtents: config.showUnalignedExtents,
  };
}
