import { fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { configSchema as bigWigConfigSchema } from "../bigwig/schema";

export const configSchema = bigWigConfigSchema.extend({
  /** Reference sequence, supplying the letters drawn when zoomed in. */
  twoBitUrl: fetchOnChange(z.string().min(1)),
  /** Letters need at least this many pixels per base to be legible. */
  minPixelsPerBase: fetchOnChange(z.number().positive().default(3)),
  /** Letters are only drawn when the visible window is no wider than this. */
  maxLetterBases: z.number().int().positive().default(500),
});
