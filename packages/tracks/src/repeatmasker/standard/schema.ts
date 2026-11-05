import type { RepeatMaskerConfig } from "../schema";
import { z } from "zod";
const uint = z.coerce.number().int().min(0).max(0xffff_ffff);
const int = z.coerce.number().int().min(-0x8000_0000).max(0x7fff_ffff);
export const standardRepeatMaskerSchema = z.object({
  name: z.string(),
  score: uint,
  strand: z.enum(["+", "-", "."]),
  swScore: uint,
  milliDiv: uint,
  milliDel: uint,
  milliIns: uint,
  genoLeft: int,
  repClass: z.string(),
  repFamily: z.string(),
  repStart: int,
  repEnd: int,
  repLeft: int,
  repeatId: uint,
});
export type StandardRepeatMaskerConfig = Pick<
  RepeatMaskerConfig,
  "rowHeight" | "showLabels" | "maxDetailBases" | "highlightClassOnHover"
> & { url: string };
