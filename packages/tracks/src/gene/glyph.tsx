import type { GeneExonPartKind } from "./geometry";
import type { GeneStrand } from "./types";

export type GeneGlyphPartId = string;

export type GeneGlyphIntron = {
  id: GeneGlyphPartId;
  kind: "intron";
  start: number;
  end: number;
};

export type GeneGlyphExon = {
  id: GeneGlyphPartId;
  kind: GeneExonPartKind;
  start: number;
  end: number;
};

export type GeneGlyphGeometry = {
  introns: GeneGlyphIntron[];
  exonParts: GeneGlyphExon[];
};

type GeneGlyphProps = {
  geometry: GeneGlyphGeometry;
  strand: GeneStrand;
  x: (position: number) => number;
  width: number;
  rowTop: number;
  rowHeight: number;
  color: string;
};

export function GeneGlyph({
  geometry,
  strand,
  x,
  width,
  rowTop,
  rowHeight,
  color,
}: GeneGlyphProps) {
  const center = rowTop + rowHeight / 2;
  const metrics = createGeneGlyphMetrics(rowHeight);
  const exonHeights: Record<GeneExonPartKind, number> = {
    cds: metrics.cdsHeight,
    utr: metrics.secondaryExonHeight,
    "noncoding-exon": metrics.secondaryExonHeight,
  };

  return (
    <>
      {geometry.introns.map((part) => {
        const interval = visiblePixelInterval(part.start, part.end, x, width);
        if (!interval) return null;
        return (
          <g key={part.id}>
            <line
              data-gene-part={part.kind}
              x1={interval.start}
              x2={interval.end}
              y1={center}
              y2={center}
              stroke={color}
              strokeWidth={metrics.intronStrokeWidth}
              pointerEvents="none"
            />
            {directionMarkCenters(
              interval.start,
              interval.end,
              metrics.directionMarkSpacing,
              metrics.minimumDirectionMarkWidth,
            ).map((markCenter) => (
              <polyline
                key={markCenter}
                data-intron-direction-mark=""
                points={directionMarkPoints(
                  markCenter,
                  center,
                  metrics.directionMarkHalfSize,
                  strand,
                )}
                fill="none"
                stroke={color}
                strokeWidth={metrics.intronStrokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
                aria-hidden="true"
              />
            ))}
          </g>
        );
      })}
      {geometry.exonParts.map((part) => {
        const interval = visiblePixelInterval(part.start, part.end, x, width);
        if (!interval) return null;
        const height = exonHeights[part.kind];
        return (
          <rect
            key={part.id}
            data-gene-part={part.kind}
            x={interval.start}
            y={center - height / 2}
            width={Math.max(1, interval.end - interval.start)}
            height={height}
            fill={color}
            pointerEvents="none"
          />
        );
      })}
    </>
  );
}

function createGeneGlyphMetrics(rowHeight: number) {
  return {
    cdsHeight: Math.max(1, rowHeight * 0.7),
    secondaryExonHeight: Math.max(1, rowHeight * 0.4),
    intronStrokeWidth: Math.max(1, rowHeight * 0.08),
    directionMarkHalfSize: Math.min(3, rowHeight * 0.2),
    directionMarkSpacing: 24,
    minimumDirectionMarkWidth: 6,
  };
}

function visiblePixelInterval(
  start: number,
  end: number,
  x: (position: number) => number,
  width: number,
) {
  const pixelStart = x(start);
  const pixelEnd = x(end);
  if (pixelEnd <= 0 || pixelStart >= width) return null;
  return { start: Math.max(0, pixelStart), end: Math.min(width, pixelEnd) };
}

function directionMarkCenters(
  start: number,
  end: number,
  spacing: number,
  minimumWidth: number,
): number[] {
  const width = end - start;
  if (width < minimumWidth) return [];
  const count = Math.max(1, Math.floor(width / spacing));
  const actualSpacing = width / (count + 1);
  return Array.from({ length: count }, (_, index) => start + actualSpacing * (index + 1));
}

function directionMarkPoints(x: number, y: number, halfSize: number, strand: GeneStrand): string {
  const outerX = strand === "+" ? x - halfSize : x + halfSize;
  return `${outerX},${y - halfSize} ${x},${y} ${outerX},${y + halfSize}`;
}
