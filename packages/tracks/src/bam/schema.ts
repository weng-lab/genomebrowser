import { fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { hexColorSchema } from "../shared/schemas";
import { rowHeightSchema } from "../shared/layout/rowLayout";

export const bamConfigSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  indexUrl: fetchOnChange(z.string().min(1)),
  sequenceUrl: fetchOnChange(z.url({ protocol: /^https?$/ }).optional()),
  maxWindow: fetchOnChange(z.number().int().min(1).max(100_000).default(50_000)),
  alignments: z
    .object({
      rowHeight: rowHeightSchema.default(14),
      forwardColor: hexColorSchema.default("#3366cc"),
      reverseColor: hexColorSchema.default("#cc3333"),
      sequenceMaxWindow: z.number().int().min(1).max(100_000).default(100),
    })
    .prefault({}),
  filters: z
    .object({
      minimumMappingQuality: z.number().int().min(0).max(254).default(0),
      includeDuplicates: z.boolean().default(true),
    })
    .prefault({}),
});
export type BamConfigInput = z.input<typeof bamConfigSchema>;
export type BamConfig = z.output<typeof bamConfigSchema>;
