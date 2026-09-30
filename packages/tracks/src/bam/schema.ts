import { fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { hexColorSchema } from "../shared/schemas";
import { rowHeightSchema } from "../shared/layout/rowLayout";

const sectionHeightSchema = z.number().int().min(10).max(1000);

export const bamCoverageScaleSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("auto") }),
  z
    .object({
      mode: z.literal("fixed"),
      forwardMax: z.number().finite().positive().optional(),
      reverseMax: z.number().finite().positive().optional(),
    })
    .refine((scale) => scale.forwardMax !== undefined || scale.reverseMax !== undefined, {
      message: "Set at least one coverage maximum",
    }),
]);

export const bamConfigSchema = z
  .object({
    url: fetchOnChange(z.string().min(1)),
    indexUrl: fetchOnChange(z.string().min(1)),
    sequenceUrl: fetchOnChange(z.url({ protocol: /^https?$/ }).optional()),
    maxWindow: fetchOnChange(z.number().int().min(1).max(100_000).default(50_000)),
    filters: z
      .object({
        minimumMappingQuality: z.number().int().min(0).max(254).default(0),
        includeDuplicates: z.boolean().default(true),
      })
      .prefault({}),
    strandColors: z
      .object({
        forward: hexColorSchema.default("#3366cc"),
        reverse: hexColorSchema.default("#cc3333"),
      })
      .prefault({}),
    alignments: z
      .object({
        show: z.boolean().default(true),
        rowHeight: rowHeightSchema.default(14),
        maxRows: z.number().int().min(1).max(10_000).default(100),
      })
      .prefault({}),
    coverage: z
      .object({
        show: z.boolean().default(true),
        height: sectionHeightSchema.default(60),
        scale: bamCoverageScaleSchema.default({ mode: "auto" }),
        graph: z.enum(["bars", "line"]).default("bars"),
        aggregation: z.enum(["mean", "max"]).default("mean"),
        showClampIndicators: z.boolean().default(true),
        clampIndicatorColor: hexColorSchema.default("#ff0000"),
      })
      .prefault({}),
    junctions: z
      .object({
        show: z.boolean().default(false),
        height: sectionHeightSchema.default(100),
        minimumSupport: z.number().int().min(1).default(1),
        maximumSpan: z.number().int().min(1).optional(),
        showCounts: z.boolean().default(true),
      })
      .prefault({}),
  })
  .refine((config) => config.alignments.show || config.coverage.show || config.junctions.show, {
    message: "Show at least one of coverage, junctions, or alignments",
  });
export type BamConfigInput = z.input<typeof bamConfigSchema>;
export type BamConfig = z.output<typeof bamConfigSchema>;
export type BamCoverageScale = z.output<typeof bamCoverageScaleSchema>;
