import { useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { NUCLEOTIDE_COLORS, NUCLEOTIDE_GLYPHS } from "./glyphs";
import type { DynseqConfig, DynseqData, DynseqPoint } from "./types";

type Props = TrackRendererProps<DynseqConfig, DynseqData>;

/**
 * One nucleotide, scaled into a cell and flipped below the axis for a negative
 * score. The glyph box is 100x100 with y=0 at the letter's top, so a positive
 * score hangs its top at (baseline - height) and a negative one starts at the
 * baseline.
 */
function Glyph({
  base,
  x,
  cellWidth,
  pixelHeight,
  baseline,
  negative,
}: {
  base: string;
  x: number;
  cellWidth: number;
  pixelHeight: number;
  baseline: number;
  negative: boolean;
}) {
  const paths = NUCLEOTIDE_GLYPHS[base];
  if (!paths || pixelHeight <= 0) return null;
  const color = NUCLEOTIDE_COLORS[base] ?? "#666666";
  const top = negative ? baseline : baseline - pixelHeight;
  return (
    <g transform={`translate(${x}, ${top}) scale(${cellWidth / 100}, ${pixelHeight / 100})`}>
      {paths.map((path, index) => (
        <path key={index} d={path.d} fill={path.fill ?? color} />
      ))}
    </g>
  );
}

export function FullDynseq({ color, config, data, region, visibleRegion, width, height }: Props) {
  const tooltip = useTooltip<DynseqPoint, DynseqConfig>();
  if (data.length === 0) return null;

  const bases = region.end - region.start;
  const middle = height / 2;
  const toX = (position: number) => ((position - region.start) / bases) * width;

  // Largest absolute score, found by looping rather than spreading into
  // Math.max: a wide window over a genome-wide file returns tens of thousands
  // of points, and spreading that many arguments overflows the call stack.
  let peak = 1e-6;
  for (const point of data) {
    const magnitude = Math.abs(point.score);
    if (magnitude > peak) peak = magnitude;
  }

  // Whether letters are legible is a question about the viewport, so it is
  // measured against visibleRegion. `region` is the overscanned render window,
  // which is wider and would demand a correspondingly smaller view.
  const visibleBases = visibleRegion.end - visibleRegion.start;
  const showLetters =
    width / Math.max(1, bases) >= config.minPixelsPerBase && visibleBases <= config.maxLetterBases;

  if (!showLetters) {
    let path = `M ${toX(region.start)} ${middle}`;
    for (const point of data) {
      path += ` L ${toX(point.position).toFixed(2)} ${(middle - (point.score / peak) * middle).toFixed(2)}`;
    }
    path += ` L ${toX(region.end)} ${middle} Z`;
    return (
      <>
        <line x1={0} y1={middle} x2={width} y2={middle} stroke="#cccccc" strokeWidth={0.5} />
        <path d={path} fill={color} opacity={0.8} />
        <text x={2} y={10} fontSize={10} fill="#666666">
          {peak.toFixed(2)}
        </text>
      </>
    );
  }

  const cellWidth = width / data.length;
  return (
    <>
      <line x1={0} y1={middle} x2={width} y2={middle} stroke="#cccccc" strokeWidth={0.5} />
      {data.map((point) => {
        const base = point.base.toUpperCase();
        if (!NUCLEOTIDE_GLYPHS[base]) return null;
        return (
          <g
            key={point.position}
            onMouseEnter={(event) => tooltip.show(point, event)}
            onMouseLeave={tooltip.hide}
          >
            <Glyph
              base={base}
              x={toX(point.position)}
              cellWidth={cellWidth}
              pixelHeight={(Math.abs(point.score) / peak) * middle}
              baseline={middle}
              negative={point.score < 0}
            />
          </g>
        );
      })}
    </>
  );
}
