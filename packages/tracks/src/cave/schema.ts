import { fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { hexColorSchema } from "../shared/schemas";

export const configSchema = z.object({
  neurotransmitter: fetchOnChange(z.enum(["GABA", "GLU"])),
  age: fetchOnChange(
    z.enum([
      "Infancy",
      "Early_Childhood",
      "Late_Childhood",
      "Adolescence",
      "Early_Adulthood",
      "Adulthood",
    ]),
  ),
  topColor: hexColorSchema.default("#000000"),
  bottomColor: hexColorSchema.default("#000000"),
});

export type CaveConfig = z.output<typeof configSchema>;
export type CaveAge = CaveConfig["age"];
export type CaveNeurotransmitter = CaveConfig["neurotransmitter"];
