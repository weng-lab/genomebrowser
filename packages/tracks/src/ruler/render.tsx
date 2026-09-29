import { useBasePairDetail } from "@weng-lab/genomebrowser";
import { SequenceBase } from "./SequenceBase";
import { useRulerHoverHighlight } from "./useRulerHoverHighlight";
import { tickStep } from "./helpers";
import { useAutoTrackHeight, type TrackRendererProps } from "@weng-lab/genomebrowser";
import type { RulerConfig } from "./schema";
import type { RulerData } from "./fetch";

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
  const basePairDetail = useBasePairDetail();
  const showSequence =
    Boolean(config.sequenceUrl) &&
    basePairDetail &&
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
      <rect
        data-genomebrowser-selection-mode="zoom"
        data-ruler-zoom-area=""
        x={x(visibleRegion.start)}
        y={0}
        width={(visibleRegion.end - visibleRegion.start) * pixelsPerBase}
        height={Math.min(height, axisY + 2)}
        pointerEvents="all"
        style={{ cursor: "crosshair", touchAction: "none" }}
        fill="transparent"
      />
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
                return (
                  <g
                    key={position}
                    aria-label={`${region.chromosome}:${(position + 1).toLocaleString("en-US")} ${base}`}
                    pointerEvents="all"
                    onPointerEnter={(event) => hoverHighlight.hover(position, event.buttons)}
                    onPointerMove={(event) => hoverHighlight.hover(position, event.buttons)}
                    onPointerLeave={hoverHighlight.clear}
                    onPointerDown={hoverHighlight.clear}
                    onPointerCancel={hoverHighlight.clear}
                  >
                    <SequenceBase
                      base={base}
                      x={x(position)}
                      y={axisY + 4}
                      width={pixelsPerBase}
                      height={sequenceHeight}
                    />
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
  // Labels are one-based positions, as in the UCSC Genome Browser. Position N is the
  // zero-based base [N - 1, N), so its tick sits at that base's center.
  const center = (position: number) => x(position - 0.5);
  const ticks = [];
  for (let position = Math.ceil((start + 1) / step) * step; position <= end; position += step) {
    ticks.push(
      <g key={position}>
        <line
          x1={center(position)}
          x2={center(position)}
          y1={axisY - 6}
          y2={axisY}
          stroke={color}
        />
        <text x={center(position)} y={axisY - 11} textAnchor="middle" fill={color} fontSize={11}>
          {position.toLocaleString("en-US")}
        </text>
      </g>,
    );
    if (step >= 5)
      for (let i = 1; i < 5; i++) {
        const minor = position + (step * i) / 5;
        if (Number.isInteger(minor) && minor <= end)
          ticks.push(
            <line
              key={minor}
              x1={center(minor)}
              x2={center(minor)}
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
