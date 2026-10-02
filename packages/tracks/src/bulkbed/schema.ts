import { fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { bedSchemaKeySchema } from "../shared/bedSchemas";
import { defaultRowHeight, rowHeightSchema } from "../shared/layout/rowLayout";

const datasetSchema = z.object({ name: z.string().min(1), url: fetchOnChange(z.string().min(1)) });
export const configSchema = z.object({
  bedSchema: fetchOnChange(bedSchemaKeySchema.optional()),
  datasets: z.array(datasetSchema).min(1),
  gap: z.number().nonnegative().optional(),
  rowHeight: rowHeightSchema.default(defaultRowHeight),
});

export type BulkBedConfig = z.output<typeof configSchema>;
export type BulkBedDataset = BulkBedConfig["datasets"][number];
