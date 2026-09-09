import { tickStep } from "./helpers";
import type { TrackRendererProps } from "@weng-lab/genomebrowser";
import type { RulerConfig } from "./schema";
import type { RulerData } from "./fetch";

const BASE_COLORS: Record<string, string> = {
  A: "#15803d",
  C: "#2563eb",
  G: "#a16207",
  T: "#dc2626",
  N: "#64748b",
};

export function Ruler({
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
  const step = tickStep(span, width);
  const ticks = [];
  const axisY = Math.min(28, height * 0.45);
  for (let base = Math.ceil(region.start / step) * step; base < region.end; base += step) {
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
        if (Number.isInteger(minor) && minor < region.end)
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
  const showSequence =
    Boolean(config.sequenceUrl) && pixelsPerBase >= config.sequenceMinPixelsPerBase;
  const sequenceHeight = Math.max(1, Math.min(25, height - axisY - 6));
  const center = x((visibleRegion.start + visibleRegion.end) / 2);
  return (
    <g aria-label="Genomic ruler" pointerEvents="none" style={{ userSelect: "none" }}>
      <line x1={0} x2={width} y1={axisY} y2={axisY} stroke={color} opacity={0.35} />
      {ticks}
      {showSequence
        ? data.records.flatMap((record) =>
            Array.from(record.sequence, (base, index) => {
              const position = record.start + index;
              const baseColor = BASE_COLORS[base.toUpperCase()] ?? BASE_COLORS.N;
              return (
                <g key={position} aria-label={`${region.chromosome}:${position} ${base}`}>
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
                    fontSize={Math.max(1, Math.min(16, pixelsPerBase - 2, sequenceHeight - 2))}
                    fontWeight={600}
                  >
                    {base}
                  </text>
                </g>
              );
            }),
          )
        : null}
      {height >= 45 && (!showSequence || data.records.length === 0) && (
        <text x={center} y={height - 9} textAnchor="middle" fontSize={11} fill={color}>
          {showSequence
            ? data.error
              ? "Reference sequence unavailable — check the source URL and range access"
              : "No reference sequence for this region"
            : `${formatSpan(visibleRegion.end - visibleRegion.start)}${config.sequenceUrl ? " · Zoom in to see reference bases" : ""}`}
        </text>
      )}
    </g>
  );
}
function formatSpan(span: number): string {
  return span >= 1e6
    ? `${+(span / 1e6).toPrecision(3)} Mb`
    : span >= 1e3
      ? `${+(span / 1e3).toPrecision(3)} kb`
      : `${span} bp`;
}
