import { z } from "zod";

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, "Expected a six-digit hexadecimal color in #RRGGBB format");
