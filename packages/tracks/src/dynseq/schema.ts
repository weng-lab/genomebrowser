import { fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { configSchema as bigWigConfigSchema } from "../bigwig/schema";

export const configSchema = bigWigConfigSchema.extend({
  /** Reference sequence, supplying the letters drawn when zoomed in. */
  twoBitUrl: fetchOnChange(z.string().min(1)),
});
