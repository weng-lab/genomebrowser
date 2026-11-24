import { z } from "zod";

/**
 * Colors as the app's color controls make them and region groups store them: six-digit hex,
 * such as #1f6fe5. A highlight saved through the sessions API may hold any CSS color, so code
 * that passes a stored color to MUI's color helpers checks it with `isHexColor` first.
 */
const hexColorPattern = /^#[0-9a-f]{6}$/i;

/**
 * The colors a color row offers, in its order, with the names it announces: a gray, then
 * seven hues dark enough for white text and to show on the tracks.
 */
export const swatchColors = [
  { name: "Gray", color: "#55585e" },
  { name: "Blue", color: "#1f6fe5" },
  { name: "Red", color: "#c8362b" },
  { name: "Orange", color: "#a8561c" },
  { name: "Green", color: "#2e7d32" },
  { name: "Crimson", color: "#b3264f" },
  { name: "Purple", color: "#7b3fc4" },
  { name: "Teal", color: "#21737a" },
];

/** Why a color was refused. */
export const hexColorMessage = "Expected a color in #RRGGBB format";

/** Whether a color is six-digit hex, which the app's color controls can show. */
export const isHexColor = (value: string) => hexColorPattern.test(value);

/** A six-digit hex color, for schemas that store one. */
export const hexColorSchema = z.string().regex(hexColorPattern, hexColorMessage);

/** A typed hex color, with or without #, in three or six digits, as lowercase #rrggbb. */
export function readHex(text: string) {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!match) return undefined;
  // Three digits double each one: #abc is #aabbcc.
  const digits = match[1].length === 3 ? match[1].replace(/./g, "$&$&") : match[1];
  return `#${digits.toLowerCase()}`;
}
