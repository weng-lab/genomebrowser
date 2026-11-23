import { z } from "zod";

/**
 * Colors as tracks, highlights, and region groups store them: six-digit hex, such as #1f6fe5.
 * The app checks and reads every typed or saved color here.
 */
const hexColorPattern = /^#[0-9a-f]{6}$/i;

/** Why a color was refused. */
export const hexColorMessage = "Expected a color in #RRGGBB format";

export const isHexColor = (value: string) => hexColorPattern.test(value);

export const hexColorSchema = z.string().regex(hexColorPattern, hexColorMessage);

/** A typed hex color, with or without #, in three or six digits, as lowercase #rrggbb. */
export function readHex(text: string) {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!match) return undefined;
  // Three digits double each one: #abc is #aabbcc.
  const digits = match[1].length === 3 ? match[1].replace(/./g, "$&$&") : match[1];
  return `#${digits.toLowerCase()}`;
}
