import { useRulerHoverHighlight } from "./useRulerHoverHighlight";
import { tickStep } from "./helpers";
import { useAutoTrackHeight, type TrackRendererProps } from "@weng-lab/genomebrowser";
import type { RulerConfig } from "./schema";
import type { RulerData } from "./fetch";

const BASE_COLORS: Record<string, string> = {
  A: "#228b22",
  C: "blue",
  G: "orange",
  T: "red",
  N: "#64748b",
};

export function Ruler({
  id,
  config,
  color,
  data,
  region,
  visibleRegion,
  width,
  height,
}: TrackRendererProps<RulerConfig, RulerData>) {
  const span = region.end - region.start;
  const pixelsPerBase = width / span;
  const x = (base: number) => (base - region.start) * pixelsPerBase;
  const axisY = 20;
  const showSequence =
    Boolean(config.sequenceUrl) &&
    pixelsPerBase >= config.sequenceMinPixelsPerBase &&
    data.records.some(
      (record) =>
        record.chromosome === visibleRegion.chromosome &&
        record.start < visibleRegion.end &&
        record.start + record.sequence.length > visibleRegion.start,
    );
  useAutoTrackHeight(id, 1, { rowHeight: showSequence ? 48 : 22, minHeight: 22 });
  const hoverHighlight = useRulerHoverHighlight(
    visibleRegion,
    width,
    showSequence,
    config.sequenceHighlightColor,
  );
  const sequenceHeight = Math.max(1, Math.min(25, height - axisY - 6));
  return (
    <g aria-label="Genomic ruler" pointerEvents="none" style={{ userSelect: "none" }}>
      <line x1={0} x2={width} y1={axisY} y2={axisY} stroke={color} opacity={0.35} />
      <RulerTicks
        visibleRegion={visibleRegion}
        region={region}
        width={width}
        color={color}
        axisY={axisY}
      />
      {showSequence
        ? data.records.flatMap((record) =>
            Array.from(
              config.distinguishMaskedBases ? record.sequence : record.sequence.toUpperCase(),
              (base, index) => {
                const position = record.start + index;
                const baseColor = BASE_COLORS[base.toUpperCase()] ?? BASE_COLORS.N;
                return (
                  <g
                    key={position}
                    aria-label={`${region.chromosome}:${position} ${base}`}
                    pointerEvents="all"
                    onPointerEnter={(event) => hoverHighlight.hover(position, event.buttons)}
                    onPointerMove={(event) => hoverHighlight.hover(position, event.buttons)}
                    onPointerLeave={hoverHighlight.clear}
                    onPointerDown={hoverHighlight.clear}
                    onPointerCancel={hoverHighlight.clear}
                  >
                    <rect
                      x={x(position) + 0.5}
                      y={axisY + 4}
                      width={Math.max(0, pixelsPerBase - 1)}
                      height={sequenceHeight}
                      fill={baseColor}
                      fillOpacity={0.1}
                    />
                    <text
                      x={x(position + 0.5)}
                      y={axisY + 4 + sequenceHeight / 2}
                      dominantBaseline="central"
                      textAnchor="middle"
                      fill={baseColor}
                      fontFamily="monospace"
                      fontSize={Math.max(
                        1,
                        Math.min(16, (pixelsPerBase - 1) / 0.6, sequenceHeight - 2),
                      )}
                      fontWeight={600}
                    >
                      {base}
                    </text>
                  </g>
                );
              },
            ),
          )
        : null}
      {data.error && <title>{`Reference sequence unavailable: ${data.error}`}</title>}
    </g>
  );
}
function RulerTicks({
  visibleRegion,
  region,
  width,
  color,
  axisY,
}: {
  visibleRegion: TrackRendererProps<RulerConfig, RulerData>["visibleRegion"];
  region: TrackRendererProps<RulerConfig, RulerData>["region"];
  width: number;
  color: string;
  axisY: number;
}) {
  const span = region.end - region.start;
  const x = (base: number) => ((base - region.start) * width) / span;
  const step = tickStep(span, width);
  // Retained data can span a huge region during zoom. Keep one viewport of
  // ticks on each side without generating offscreen ticks across that old region.
  const visibleSpan = visibleRegion.end - visibleRegion.start;
  const start = Math.max(region.start, visibleRegion.start - visibleSpan);
  const end = Math.min(region.end, visibleRegion.end + visibleSpan);
  const ticks = [];
  for (let base = Math.ceil(start / step) * step; base < end; base += step) {
    ticks.push(
      <g key={base}>
        <line x1={x(base)} x2={x(base)} y1={axisY - 6} y2={axisY} stroke={color} />
        <text x={x(base)} y={axisY - 11} textAnchor="middle" fill={color} fontSize={11}>
          {base.toLocaleString("en-US")}
        </text>
      </g>,
    );
    if (step >= 5)
      for (let i = 1; i < 5; i++) {
        const minor = base + (step * i) / 5;
        if (Number.isInteger(minor) && minor < end)
          ticks.push(
            <line
              key={minor}
              x1={x(minor)}
              x2={x(minor)}
              y1={axisY - 3}
              y2={axisY}
              stroke={color}
              opacity={0.45}
            />,
          );
      }
  }
  return <>{ticks}</>;
}
