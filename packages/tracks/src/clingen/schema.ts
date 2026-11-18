import { fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { bedSchemas } from "../shared/bedSchemas";
import { rowHeightSchema } from "../shared/layout/rowLayout";

const bed9 = bedSchemas.bed9.omit({ color: true });
const reserved = bedSchemas.bed9.shape.color;
const dosagePrefix = bed9.extend({
  reserved,
  url: z.string(),
  geneSymbol: z.string(),
  geneId: z.string(),
  cytoBand: z.string(),
  dateLastEvaluated: z.string(),
  _omimID: z.string(),
  _omimDesc: z.string(),
});
const dosageSuffix = {
  PMID1: z.string(),
  PMID2: z.string(),
  PMID3: z.string(),
  PMID4: z.string(),
  PMID5: z.string(),
  PMID6: z.string(),
  _mouseOver: z.string(),
  mondoID: z.string(),
};

export const haploSchema = dosagePrefix.extend({
  haploScore: z.string(),
  haploDescription: z.string(),
  ...dosageSuffix,
});
export const triploSchema = dosagePrefix.extend({
  triploScore: z.string(),
  triploDescription: z.string(),
  ...dosageSuffix,
});
export const geneDiseaseSchema = bed9.extend({
  itemRgb: reserved,
  geneSymbol: z.string(),
  HGNCid: z.string(),
  MONDOid: z.string(),
  Inheritance: z.string(),
  SOPversion: z.string(),
  Classification: z.string(),
  ClinGenURL: z.string(),
  DateCurated: z.string(),
  Mouseover: z.string(),
});
export const cspecSchema = bed9.extend({
  reserved,
  disease: z.string(),
  panel: z.string(),
  status: z.string(),
});

export const clinGenConfigSchema = z.object({
  url: fetchOnChange(z.url({ protocol: /^https?$/ })),
  rowHeight: rowHeightSchema.default(18),
  showLabels: z.boolean().default(true),
  maxDetailBases: fetchOnChange(z.number().int().positive().default(5_000_000)),
});
export type ClinGenConfig = z.output<typeof clinGenConfigSchema>;
