import { z } from "zod";
import { defineTrackModule } from "../../modules/defineTrackModule";
import { fetchBigBed } from "./fetch";
import { DenseBigBed, SquishBigBed } from "./render";

const bigBedInputSchema = z.object({
  url: z.string().min(1),
  schema: z.instanceof(z.ZodObject).optional(),
});

export const bigBedModule = defineTrackModule({
  type: "bigbed",
  defaults: {
    height: 60,
    color: "#4b9560",
  },
  schema: bigBedInputSchema,
  fetch: fetchBigBed,
  render: {
    dense: DenseBigBed,
    squish: SquishBigBed,
  },
});
