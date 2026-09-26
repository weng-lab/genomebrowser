import type { BamRecord } from "@weng-lab/genomic-reader";

type CigarOperation = BamRecord["cigar"][number];
type SpanKind = "M" | "X" | "D" | "N";

const spanKinds: Partial<Record<string, SpanKind>> = { M: "M", "=": "M", X: "X", D: "D", N: "N" };

export const roundPixel = (value: number) => Math.round(value * 100) / 100;

/**
 * SVG path data for a read's CIGAR marks, one path per kind of mark, so the
 * element count stays constant however many operations a read has. Marks closer
 * than a pixel merge, which keeps zoomed-out long reads cheap to draw.
 */
export function buildCigarPaths(
  record: BamRecord,
  options: {
    x: (position: number) => number;
    width: number;
    regionStart: number;
    regionEnd: number;
    rowHeight: number;
  },
) {
  const { x, width, regionStart, regionEnd, rowHeight } = options;
  const y = rowHeight * 0.2;
  const height = rowHeight * 0.6;
  const middle = rowHeight / 2;
  const clip = (position: number) => roundPixel(Math.max(0, Math.min(width, x(position))));
  const spans: Record<SpanKind, number[][]> = { M: [], X: [], D: [], N: [] };
  const ticks = { I: new Set<number>(), S: new Set<number>() };
  /** Aligned blocks in view, for drawing letters. */
  const blocks: { operation: CigarOperation; position: number }[] = [];
  for (const operation of record.cigar) {
    const position = record.start + operation.referenceOffset;
    if (operation.op === "I" || operation.op === "S") {
      if (position >= regionStart && position < regionEnd)
        ticks[operation.op].add(Math.round(x(position)));
      continue;
    }
    const kind = spanKinds[operation.op];
    if (!kind || position >= regionEnd || position + operation.length <= regionStart) continue;
    const aligned = kind === "M" || kind === "X";
    const left = clip(position);
    const right = Math.max(left + (aligned ? 1 : 0), clip(position + operation.length));
    const previous = spans[kind].at(-1);
    if (previous && left - previous[1] < 1) previous[1] = Math.max(previous[1], right);
    else spans[kind].push([left, right]);
    if (aligned) blocks.push({ operation, position });
  }
  const lines = (kind: "D" | "N") =>
    spans[kind]
      .filter(([left, right]) => right - left >= 1)
      .map(([left, right]) => `M${left} ${middle}H${right}`)
      .join("");
  const rectangles = (kind: "M" | "X") =>
    spans[kind]
      .map(([left, right]) => `M${left} ${y}h${roundPixel(right - left)}v${height}H${left}Z`)
      .join("");
  const tickPath = (kind: "I" | "S") =>
    [...ticks[kind]].map((tick) => `M${tick} ${y}v${height}m-2 ${-height}h4`).join("");
  return {
    paths: {
      M: rectangles("M"),
      X: rectangles("X"),
      D: lines("D"),
      N: lines("N"),
      I: tickPath("I"),
      S: tickPath("S"),
    },
    blocks,
    start: clip(record.start),
    end: clip(record.end),
  };
}
