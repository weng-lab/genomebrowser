import { fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { bedSchemaKeySchema } from "../shared/bedSchemas";
import { defaultRowHeight, rowHeightSchema } from "../shared/layout/rowLayout";

export const configSchema = z.object({
  bedSchema: fetchOnChange(bedSchemaKeySchema.optional()),
  url: fetchOnChange(z.string().min(1)),
  rowHeight: rowHeightSchema.default(defaultRowHeight),
});

export type BigBedConfig = z.output<typeof configSchema>;
