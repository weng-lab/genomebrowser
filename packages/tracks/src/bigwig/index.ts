import type { ModuleCreateInput, ModuleInstance } from "@weng-lab/genomebrowser";
import { defineTrackModule, fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { hexColorSchema } from "../shared/schemas";
import { fetchBigWig } from "./fetch";
import { DenseBigWig, FullBigWig } from "./render";
import { BigWigSettings } from "./settings";
import { BigWigTooltip } from "./tooltip";
import type { SignalPoint } from "../shared/signal";

const yRangeSchema = z
  .object({ min: z.number().optional(), max: z.number().optional() })
  .refine((range) => range.min === undefined || range.max === undefined || range.min < range.max, {
    error: "min must be less than max",
    path: ["min"],
  });
const configSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  fillWithZero: z.boolean().default(false),
  yRange: yRangeSchema.optional(),
  showClampIndicators: z.boolean().default(true),
  clampIndicatorColor: hexColorSchema.default("#ff0000"),
});

export const bigWigModule = defineTrackModule<SignalPoint>()({
  type: "bigwig",
  defaults: { height: 80, color: "#2266aa" },
  configSchema,
  fetch: fetchBigWig,
  render: { full: FullBigWig, dense: DenseBigWig },
  settingsComponent: BigWigSettings,
  tooltipComponent: BigWigTooltip,
});

export type BigWigCreateInput = ModuleCreateInput<typeof bigWigModule>;
export type BigWigConfig = ModuleInstance<typeof bigWigModule>["config"];
export type { BigWigData, BigWigDisplay, BigWigInteraction, YRange, YRangeOverride } from "./types";
