import type { DraftValidation } from "./draftInput";

const hexColorPattern = /^#[0-9a-f]{6}$/i;

export function normalizeHexColor(value: string) {
  return hexColorPattern.test(value) ? value.toUpperCase() : undefined;
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
