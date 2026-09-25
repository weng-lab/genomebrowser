/**
 * Nucleotide letter geometry from the weng-lab LogoJS package, each path drawn
 * in a 100x100 box. Only the geometry is reused: logojs-react's components are
 * built against React 16 and do not render under React 19, so the letters are
 * emitted as plain SVG here.
 */
export const NUCLEOTIDE_GLYPHS: Record<string, { d: string; fill?: string }[]> = {
  A: [
    { d: "M 0 100 L 33 0 L 66 0 L 100 100 L 75 100 L 66 75 L 33 75 L 25 100 L 0 100" },
    { d: "M 41 55 L 50 25 L 58 55 L 41 55", fill: "#ffffff" },
  ],
  C: [
    {
      d: "M 100 28 C 100 -13 0 -13 0 50 C 0 113 100 113 100 72 L 75 72 C 75 90 30 90 30 50 C 30 10 75 10 75 28 L 100 28",
    },
  ],
  G: [
    {
      d: "M 100 28 C 100 -13 0 -13 0 50 C 0 113 100 113 100 72 L 100 48 L 55 48 L 55 72 L 75 72 C 75 90 30 90 30 50 C 30 10 75 5 75 28 L 100 28",
    },
  ],
  T: [{ d: "M 0 0 L 0 20 L 35 20 L 35 100 L 65 100 L 65 20 L 100 20 L 100 0 L 0 0" }],
};

/** Base colors from the LogoJS DNA alphabet. */
export const NUCLEOTIDE_COLORS: Record<string, string> = {
  A: "#ff0000",
  C: "#0000ff",
  G: "#ffa500",
  T: "#228b22",
};
