import type { BamRecord } from "@weng-lab/genomic-reader";
import type { BamConfig } from "./types";

/** One distinct splice junction and the number of alignments that support it. */
export type BamJunction = {
  kind: "junction";
  chromosome: string;
  /** First skipped reference base, zero-based. */
  start: number;
  /** End of the skipped reference span, exclusive. */
  end: number;
  support: number;
};

/**
 * Tallies CIGAR `N` operations by chromosome and splice boundaries.
 *
 * An alignment reaches every junction it contains, so a junction's count is
 * complete whenever any part of it lies in the loaded region.
 */
export function computeJunctions(records: readonly BamRecord[]): BamJunction[] {
  const junctions = new Map<string, BamJunction>();
  for (const record of records) {
    for (const operation of record.cigar) {
      if (operation.op !== "N" || operation.length === 0) continue;
      const start = record.start + operation.referenceOffset;
      const end = start + operation.length;
      const key = `${record.chromosome}:${start}:${end}`;
      const junction = junctions.get(key);
      if (junction) junction.support++;
      else
        junctions.set(key, {
          kind: "junction",
          chromosome: record.chromosome,
          start,
          end,
          support: 1,
        });
    }
  }
  return [...junctions.values()].sort(
    (left, right) =>
      left.chromosome.localeCompare(right.chromosome) ||
      left.start - right.start ||
      left.end - right.end,
  );
}

export function filterJunctions(
  junctions: readonly BamJunction[],
  { minimumSupport, maximumSpan }: Pick<BamConfig["junctions"], "minimumSupport" | "maximumSpan">,
): BamJunction[] {
  return junctions.filter(
    (junction) =>
      junction.support >= minimumSupport &&
      (maximumSpan === undefined || junction.end - junction.start <= maximumSpan),
  );
}

export type JunctionArc = {
  junction: BamJunction;
  x1: number;
  x2: number;
  /** Quadratic control point height; the drawn curve peaks half way to it. */
  controlY: number;
  peakY: number;
  strokeWidth: number;
  label?: { x: number; y: number };
};

const ARC_MIN_HEIGHT = 8;
const LABEL_HEIGHT = 11;
const LABEL_GAP = 2;
/** Advance width of one digit at the 10px label size, with a little slack. */
const LABEL_DIGIT_WIDTH = 6.5;

/**
 * Places one arc per junction above a shared baseline. Arc height grows with
 * on-screen span so nested junctions stay distinct; thickness grows with the
 * log of support. Count labels are placed highest support first, and a label
 * that would overlap one already placed is omitted.
 */
export function layoutJunctionArcs(
  junctions: readonly BamJunction[],
  {
    x,
    width,
    height,
    showCounts,
  }: {
    x: (position: number) => number;
    width: number;
    height: number;
    showCounts: boolean;
  },
): JunctionArc[] {
  const baseline = height - 1;
  const labelSpace = showCounts ? LABEL_HEIGHT + LABEL_GAP : 0;
  const maxArcHeight = Math.max(ARC_MIN_HEIGHT, baseline - labelSpace - 1);
  // Spans past the canvas edge would flatten every visible arc, so cap them.
  const pixelSpan = (junction: BamJunction) => Math.min(width, x(junction.end) - x(junction.start));
  let widest = 0;
  let peakSupport = 1;
  for (const junction of junctions) {
    widest = Math.max(widest, pixelSpan(junction));
    peakSupport = Math.max(peakSupport, junction.support);
  }
  const arcs = junctions.map((junction): JunctionArc => {
    // Square root keeps short junctions from flattening onto the baseline.
    const share = widest > 0 ? Math.sqrt(pixelSpan(junction) / widest) : 1;
    const arcHeight = ARC_MIN_HEIGHT + (maxArcHeight - ARC_MIN_HEIGHT) * share;
    return {
      junction,
      x1: x(junction.start),
      x2: x(junction.end),
      controlY: baseline - arcHeight * 2,
      peakY: baseline - arcHeight,
      strokeWidth:
        peakSupport > 1 ? 1 + (Math.log(junction.support) / Math.log(peakSupport)) * 4 : 1,
    };
  });
  if (!showCounts) return arcs;

  const placed: { left: number; right: number; top: number; bottom: number }[] = [];
  for (const arc of [...arcs].sort(
    (left, right) => right.junction.support - left.junction.support,
  )) {
    const middle = (arc.x1 + arc.x2) / 2;
    const halfWidth = (String(arc.junction.support).length * LABEL_DIGIT_WIDTH) / 2;
    const bottom = arc.peakY - LABEL_GAP;
    const box = {
      left: middle - halfWidth,
      right: middle + halfWidth,
      top: bottom - LABEL_HEIGHT,
      bottom,
    };
    if (box.top < 0 || box.right < 0 || box.left > width) continue;
    if (
      placed.some(
        (other) =>
          box.left < other.right &&
          box.right > other.left &&
          box.top < other.bottom &&
          box.bottom > other.top,
      )
    )
      continue;
    placed.push(box);
    arc.label = { x: middle, y: bottom - 2 };
  }
  return arcs;
}
