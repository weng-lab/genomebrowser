import { useBasePairDetail } from "@weng-lab/genomebrowser";
import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { DenseBigWig, FullBigWig, getViewportRange } from "../bigwig/render";
import { createYScale } from "../bigwig/helpers";
import { createGenomicXScale } from "../shared/coordinates";
import { ValueLabels } from "../shared/ValueLabels";
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

export function FullDynseq(props: Props) {
  const { data } = props;
  const basePairDetail = useBasePairDetail();
  const showLetters = basePairDetail && data.sequence.length > 0;
  return showLetters ? <SequenceDynseq {...props} /> : <FullBigWig {...props} data={data.signal} />;
}

export function DenseDynseq(props: Props) {
  return <DenseBigWig {...props} data={props.data.signal} />;
}

function SequenceDynseq({ config, data, region, visibleRegion, width, height }: Props) {
  const tooltip = useTooltip<DynseqPoint, DynseqConfig>();
  const interaction = useInteraction<DynseqPoint>();
  const range = getViewportRange(config, data.signal, visibleRegion, region, width);
  const y = createYScale(range, height);
  const clamp = (value: number) => Math.max(range.min, Math.min(range.max, value));
  const baseline = y(clamp(0));
  const toX = createGenomicXScale(region, width);
  const cellWidth = width / (region.end - region.start);
  const points: DynseqPoint[] = [];
  for (const record of data.signal) {
    if (record.kind !== "value" || record.chromosome !== region.chromosome) continue;
    for (const sequence of data.sequence) {
      if (sequence.chromosome !== region.chromosome) continue;
      const start = Math.max(record.start, sequence.start, region.start);
      const end = Math.min(record.end, sequence.end, region.end);
      for (let position = start; position < end; position++) {
        const base = sequence.sequence[position - sequence.start]?.toUpperCase();
        if (base && NUCLEOTIDE_GLYPHS[base]) points.push({ position, score: record.value, base });
      }
    }
  }
  return (
    <g>
      <line x1={0} y1={baseline} x2={width} y2={baseline} stroke="#dddddd" strokeWidth={1} />
      {points.map((point) => (
        <g key={point.position}>
          <Glyph
            base={point.base}
            x={toX(point.position)}
            cellWidth={cellWidth}
            pixelHeight={Math.abs(y(clamp(point.score)) - baseline)}
            baseline={baseline}
            negative={point.score < 0}
          />
          {config.showClampIndicators && (point.score > range.max || point.score < range.min) && (
            <line
              x1={toX(point.position) + cellWidth / 2}
              x2={toX(point.position) + cellWidth / 2}
              y1={point.score > range.max ? 0 : height - 2}
              y2={point.score > range.max ? 2 : height}
              stroke={config.clampIndicatorColor}
              strokeWidth={1}
            />
          )}
          <rect
            x={toX(point.position)}
            width={cellWidth}
            height={height}
            fill="transparent"
            onMouseEnter={(event) => {
              tooltip.show(point, event);
              interaction?.onHover?.(point);
            }}
            onMouseLeave={() => {
              tooltip.hide();
              interaction?.onLeave?.(point);
            }}
          />
        </g>
      ))}
      <ValueLabels
        height={height}
        ticks={[
          { value: range.max, y: 0 },
          { value: range.min, y: height },
          ...(range.min < 0 && range.max > 0 ? [{ value: 0, y: baseline }] : []),
        ]}
      />
    </g>
  );
}
