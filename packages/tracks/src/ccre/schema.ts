import { fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { defaultRowHeight, rowHeightSchema } from "../shared/layout/rowLayout";

export const configSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  rowHeight: rowHeightSchema.default(defaultRowHeight),
});

export type CcreBigBedConfig = z.output<typeof configSchema>;
