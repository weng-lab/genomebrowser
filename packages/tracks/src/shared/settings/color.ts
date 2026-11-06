import { hexColorSchema } from "@weng-lab/genomebrowser/schemas";
import type { DraftValidation } from "./draftInput";

export function normalizeHexColor(value: string) {
  return hexColorSchema.safeParse(value).success ? value.toUpperCase() : undefined;
}

export function validateHexColorDraft(value: string): DraftValidation<string> {
  const color = normalizeHexColor(value);
  return color === undefined
    ? {
        ok: false,
        error: "Enter a six-digit hexadecimal color, for example #1A2B3C.",
      }
    : { ok: true, value: color };
}
