import { z } from "zod";

const unsignedInteger = z.coerce.number().int().nonnegative();
const positiveInteger = z.coerce.number().int().positive();
const cdsStatus = z.enum(["none", "unk", "incmpl", "cmpl"]);
const itemRgb = z.string().refine(isItemRgb, "Expected an unsigned integer or R,G,B value");

function isItemRgb(value: string) {
  if (/^\d+$/.test(value)) return Number(value) <= 0xffff_ffff;
  const components = value.split(",");
  return (
    components.length === 3 &&
    components.every((component) => /^\d+$/.test(component) && Number(component) <= 255)
  );
}

function integerList(item: z.ZodType<number>) {
  return z.string().transform((value) => {
    const values = value.split(",");
    if (values.at(-1) === "") values.pop();
    return values.map((entry) => item.parse(z.string().min(1).parse(entry)));
  });
}

/** BigGenePredPlusV1 columns after the chromosome, start, and end fields. */
export const bigGenePredPlusV1Schema = z.object({
  name: z.string().min(1),
  score: z.coerce.number().int().min(0).max(1000),
  strand: z.enum(["+", "-"]),
  thickStart: unsignedInteger,
  thickEnd: unsignedInteger,
  reserved: itemRgb,
  blockCount: positiveInteger,
  blockSizes: integerList(positiveInteger),
  chromStarts: integerList(unsignedInteger),
  name2: z.string(),
  cdsStartStat: cdsStatus,
  cdsEndStat: cdsStatus,
  exonFrames: integerList(z.coerce.number().int().min(-1).max(2)),
  type: z.string(),
  geneName: z.string(),
  geneName2: z.string(),
  geneType: z.string(),
  tags: z.string(),
  attributes: z.string(),
});
