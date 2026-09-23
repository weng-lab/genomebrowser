import { z } from "zod";

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Expected a six-digit hexadecimal color in #RRGGBB format");
