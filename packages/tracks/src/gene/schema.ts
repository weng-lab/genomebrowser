import { fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { defaultRowHeight, rowHeightSchema } from "../shared/layout/rowLayout";
import { hexColorSchema } from "../shared/schemas";

export const configSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  geneName: z.string().optional(),
  tagColors: z
    .array(
      z.object({
        tag: z.string().trim().min(1),
        color: hexColorSchema,
      }),
    )
    .transform((tagColors) => {
      const seen = new Set<string>();
      return tagColors.filter(({ tag }) => {
        if (seen.has(tag)) return false;
        seen.add(tag);
        return true;
      });
    })
    .default([{ tag: "MANE_Select", color: "#000000" }]),
  highlightColor: hexColorSchema.default("#000000"),
  rowHeight: rowHeightSchema.default(defaultRowHeight),
});

export type GeneConfig = z.output<typeof configSchema>;
export type GeneTagColor = GeneConfig["tagColors"][number];
