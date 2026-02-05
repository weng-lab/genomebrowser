import { BamRect } from "./types";

export const STRAND_COLORS = {
  positive: "#F7F71A",
  negative: "#53F71A",
};

export const CIGAR_COLORS = {
  insertion: "#ff69b4",
  deletion: "red",
};

export function getRealBamRect(rect: BamRect, reverseX: (value: number) => number): BamRect {
  return {
    ...rect,
    start: Math.round(reverseX(rect.start)),
    end: Math.round(reverseX(rect.end)),
    cigarOps: rect.cigarOps.map((cg) => ({
      ...cg,
      opStart: Math.round(reverseX(cg.opStart)),
      opEnd: Math.round(reverseX(cg.opEnd)),
    })),
  };
}

export function getStrandColor(rect: BamRect, defaultColor: string): string {
  if (rect.strand !== undefined) {
    return rect.strand ? STRAND_COLORS.positive : STRAND_COLORS.negative;
  }
  return rect.color || defaultColor;
}
