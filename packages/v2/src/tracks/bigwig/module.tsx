import { z } from "zod";
import { defineTrackModule } from "../../modules/defineTrackModule";
import { fetchOnChange } from "../../modules/fetchOnChange";
import { TrackTooltip } from "../shared/TrackTooltip";
import { fetchBigWig } from "./fetch";
import { DenseBigWig, FullBigWig } from "./render";
import { BigWigSettings } from "./settings";

const yRangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
  })
  .refine((range) => range.min < range.max, {
    error: "min must be less than max",
    path: ["min"],
  });

const bigWigConfigSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  fillWithZero: z.boolean().default(false),
  yRange: yRangeSchema.optional(),
});

export const bigWigModule = defineTrackModule({
  type: "bigwig",
  defaults: {
    height: 80,
    color: "#2266aa",
    tooltip: ({ item }) => (
      <TrackTooltip>
        <text fill="#000000" fontSize={12} dominantBaseline="middle">
          {item.max?.toFixed(2)}
        </text>
      </TrackTooltip>
    ),
  },
  schema: bigWigConfigSchema,
  fetch: fetchBigWig,
  render: {
    full: FullBigWig,
    dense: DenseBigWig,
  },
  settingsComponent: BigWigSettings,
});
