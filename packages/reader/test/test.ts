import { createBigBedFile } from "../src/lib";
import { z } from "zod";

// Manual live-network example; excluded from the automated TypeScript and Vitest suites.
const gene = "https://users.wenglab.org/niship/bigGenePredEx4.bb";
const uint = z.coerce.number().int().nonnegative();

const commaSeparatedUInts = z
  .string()
  .regex(/^\d+(?:,\d+)*,?$/)
  .transform((value) => value.replace(/,$/, "").split(",").map(Number));

const exonFrames = z
  .string()
  .regex(/^(?:-1|0|1|2)(?:,(?:-1|0|1|2))*,?$/)
  .transform((value) => value.replace(/,$/, "").split(",").map(Number));

const bigGenePredSchema = z.object({
  name: z.string(),
  score: uint.pipe(z.number().max(1000)),
  strand: z.enum(["+", "-"]),
  thickStart: uint,
  thickEnd: uint,
  reserved: uint,
  blockCount: uint,
  blockSizes: commaSeparatedUInts,
  chromStarts: commaSeparatedUInts,
  name2: z.string(),
  cdsStartStat: z.enum(["none", "unk", "incmpl", "cmpl"]),
  cdsEndStat: z.enum(["none", "unk", "incmpl", "cmpl"]),
  exonFrames,
  type: z.string(),
  geneName: z.string(),
  geneName2: z.string(),
  geneType: z.string(),
});

const file = createBigBedFile({ url: gene, schema: bigGenePredSchema });

//chr19:44,905,791-44,909,393
const result = await file.read({ chromosome: "chr19", start: 44905791, end: 44909393 });

console.log(result);
