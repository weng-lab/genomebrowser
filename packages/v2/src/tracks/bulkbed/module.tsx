import { z } from "zod";
import { defineTrackModule } from "../../modules/defineTrackModule";
import { fetchOnChange } from "../../modules/fetchOnChange";
import { TrackTooltip } from "../shared/TrackTooltip";
import { fetchBulkBed } from "./fetch";
import { FullBulkBed } from "./render";
import { BulkBedSettings } from "./settings";
import type { BulkBedRect } from "./types";

const bulkBedDatasetSchema = z.object({
  name: z.string().min(1),
  url: fetchOnChange(z.string().min(1)),
});

const bulkBedInputSchema = z.object({
  datasets: z.array(bulkBedDatasetSchema).min(1),
  gap: z.number().nonnegative().optional(),
});

export const bulkBedModule = defineTrackModule<BulkBedRect>()({
  type: "bulkbed",
  defaults: {
    height: 80,
    color: "#4b9560",
  },
  tooltipComponent: ({ item }) => (
    <TrackTooltip>
      <text fill="#000000" fontSize={12} dominantBaseline="middle">
        {item.name || item.datasetName || `${item.start}-${item.end}`}
      </text>
    </TrackTooltip>
  ),
  schema: bulkBedInputSchema,
  fetch: fetchBulkBed,
  render: {
    full: FullBulkBed,
  },
  settingsComponent: BulkBedSettings,
});
