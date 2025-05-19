export const BLACK = 0;
export const WHITE = 255;

export const Pastels = [
  "#fd7f6f",
  "#7eb0d5",
  "#b2e061",
  "#bd7ebe",
  "#ffb55a",
  "#ffee65",
  "#beb9db",
  "#fdcce5",
  "#8bd3c7",
];

export const Vibrant = [
  "#e60049",
  "#0bb4ff",
  "#50e991",
  "#e6d800",
  "#9b19f5",
  "#ffa300",
  "#dc0ab4",
  "#b3d4ff",
  "#00bfa0",
];

function validHex(color: string): string {
  /* validate color is a hex color */
  color = color.replace(/[^0-9a-f]/gi, "");
  if (color.length === 3) color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  if (color.length === 8) color = color.substring(0, 6);
  if (color.length !== 6) throw new Error(color + " is not a valid hex color");

  /* return the first 6 hex digits */
  return color;
}

/**
 * Convert a color to a ligher shade.
 * @param color the original color as a hex string (e.g. #fff or ABCDEF)
 * @param luminosity the fraction by which to change the brightness, from 0 to 1
 */
export function lighten(color: string, luminosity: number) {
  /* validate color is a hex color */
  color = validHex(color);

  /* calculate lighter color and return */
  let newColor: string = "#";
  for (let i = 0; i < 3; ++i) {
    const c = parseInt(color.substr(i * 2, 2), 16);
    const s = Math.round(Math.min(Math.max(BLACK, c + luminosity * WHITE), WHITE)).toString(16);
    newColor += ("00" + s).substr(s.length);
  }
  return newColor;
}
