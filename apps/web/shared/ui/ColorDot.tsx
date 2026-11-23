import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";

type ColorDotProps = {
  /** A color, or null for none, which shows as a dotted ring. */
  color: string | null;
  /** The dot's width and height, in pixels. */
  size: number;
  /** A ring in the color instead of a filled dot, as an outlined highlight is drawn. */
  outlined?: boolean;
  /** Faded, such as for a hidden highlight. */
  faded?: boolean;
  sx?: SxProps<Theme>;
};

/** A color as a small dot: filled, a ring, or, for no color, a dotted ring. */
export function ColorDot({ color, size, outlined = false, faded = false, sx }: ColorDotProps) {
  return (
    <Box
      aria-hidden
      sx={[
        {
          flexShrink: 0,
          width: size,
          height: size,
          borderRadius: "50%",
          opacity: faded ? 0.35 : 1,
        },
        colorDotSx(color, outlined),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}

/** A dot's fill and border, for round controls that show a color as a `ColorDot` does. */
export function colorDotSx(color: string | null, outlined = false) {
  if (color === null) return { border: 2, borderStyle: "dotted", borderColor: "text.secondary" };
  return { border: 2, borderColor: color, bgcolor: outlined ? "transparent" : color };
}
