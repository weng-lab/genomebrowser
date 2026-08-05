import type { DraftValidation } from "./draftInput";

const hexColorPattern = /^#[0-9a-f]{6}$/i;

export const neutralTrackColor = "#000000";

export type HsvColor = {
  hue: number;
  saturation: number;
  value: number;
};

export function normalizeHexColor(value: string) {
  return hexColorPattern.test(value) ? value.toUpperCase() : undefined;
}

export function validateHexColorDraft(
  value: string,
  optional: boolean,
): DraftValidation<string | undefined> {
  if (optional && value === "") return { ok: true, value: undefined };

  const color = normalizeHexColor(value);
  return color === undefined
    ? {
        ok: false,
        error: "Enter a six-digit hexadecimal color, for example #1A2B3C.",
      }
    : { ok: true, value: color };
}

export function hexToHsv(value: string): HsvColor {
  const color = normalizeHexColor(value);
  if (color === undefined)
    throw new Error(`Expected a six-digit hexadecimal color, received ${value}`);

  const red = Number.parseInt(color.slice(1, 3), 16) / 255;
  const green = Number.parseInt(color.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(color.slice(5, 7), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;

  let hue = 0;
  if (delta !== 0) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }

  return {
    hue: hue < 0 ? hue + 360 : hue,
    saturation: maximum === 0 ? 0 : (delta / maximum) * 100,
    value: maximum * 100,
  };
}

export function hsvToHex({ hue, saturation, value }: HsvColor) {
  const constrainedColor = constrainHsv({ hue, saturation, value });
  const normalizedHue = constrainedColor.hue;
  const normalizedSaturation = constrainedColor.saturation / 100;
  const normalizedValue = constrainedColor.value / 100;
  const chroma = normalizedValue * normalizedSaturation;
  const hueSection = normalizedHue / 60;
  const secondary = chroma * (1 - Math.abs((hueSection % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;
  if (hueSection < 1) [red, green] = [chroma, secondary];
  else if (hueSection < 2) [red, green] = [secondary, chroma];
  else if (hueSection < 3) [green, blue] = [chroma, secondary];
  else if (hueSection < 4) [green, blue] = [secondary, chroma];
  else if (hueSection < 5) [red, blue] = [secondary, chroma];
  else [red, blue] = [chroma, secondary];

  const match = normalizedValue - chroma;
  return `#${toHex(red + match)}${toHex(green + match)}${toHex(blue + match)}`;
}

export function constrainHsv({ hue, saturation, value }: HsvColor): HsvColor {
  return {
    hue: ((hue % 360) + 360) % 360,
    saturation: clamp(saturation, 0, 100),
    value: clamp(value, 0, 100),
  };
}

/** Matches the renderer's defensive additive lightening for existing color strings. */
export function lightenColor(value: string, amount: number) {
  const color = normalizeRendererColor(value);
  let result = "#";
  for (let offset = 0; offset < color.length; offset += 2) {
    const channel = Number.parseInt(color.slice(offset, offset + 2), 16);
    result += Math.round(Math.min(Math.max(0, channel + amount * 255), 255))
      .toString(16)
      .padStart(2, "0");
  }
  return result.toUpperCase();
}

function normalizeRendererColor(value: string) {
  let color = value.replace(/[^0-9a-f]/gi, "");
  if (color.length === 3) {
    color = color
      .split("")
      .map((channel) => channel + channel)
      .join("");
  }
  return color.length >= 6 ? color.slice(0, 6) : "000000";
}

function toHex(value: number) {
  return Math.round(value * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
