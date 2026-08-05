import { z } from "zod";
import { defineTrackModule } from "../../modules/defineTrackModule";
import { fetchOnChange } from "../../modules/fetchOnChange";
import { hexColorSchema } from "../../modules/schemas";
import { TrackTooltip } from "../shared/TrackTooltip";
import { fetchBigWig } from "./fetch";
import { formatBigWigTooltip } from "./helpers";
import { DenseBigWig, FullBigWig } from "./render";
import { BigWigSettings } from "./settings";
import type { RenderedBigWigPoint } from "./types";

const yRangeSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .refine((range) => range.min === undefined || range.max === undefined || range.min < range.max, {
    error: "min must be less than max",
    path: ["min"],
  });

const bigWigConfigSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  fillWithZero: z.boolean().default(false),
  yRange: yRangeSchema.optional(),
  showClampIndicators: z.boolean().default(true),
  clampIndicatorColor: hexColorSchema.default("#ff0000"),
});

export const bigWigModule = defineTrackModule<RenderedBigWigPoint>()({
  type: "bigwig",
  defaults: {
    height: 80,
    color: "#2266aa",
  },
  tooltipComponent: ({ item }) => (
    <TrackTooltip>
      <text fill="#000000" fontSize={12} dominantBaseline="middle">
        Signal: {formatBigWigTooltip(item)}
      </text>
    </TrackTooltip>
  ),
  configSchema: bigWigConfigSchema,
  fetch: fetchBigWig,
  render: {
    full: FullBigWig,
    dense: DenseBigWig,
  },
  settingsComponent: BigWigSettings,
});
