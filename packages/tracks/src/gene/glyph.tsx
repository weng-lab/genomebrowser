import type {
  CompositeGeneExonPart,
  CompositeGeneIntronRun,
  GeneExonPart,
  GeneIntronPart,
} from "./geometry";
import type { GeneTranscript } from "./types";

type GeneGlyphProps = {
  introns: readonly (GeneIntronPart | CompositeGeneIntronRun)[];
  exonParts: readonly (GeneExonPart | CompositeGeneExonPart)[];
  strand: GeneTranscript["strand"];
  x: (position: number) => number;
  width: number;
  rowTop: number;
  rowHeight: number;
  color: string;
};

export function GeneGlyph({
  introns,
  exonParts,
  strand,
  x,
  width,
  rowTop,
  rowHeight,
  color,
}: GeneGlyphProps) {
  const center = rowTop + rowHeight / 2;
  const metrics = createGeneGlyphMetrics(rowHeight);
  const exonHeights: Record<GeneExonPart["kind"], number> = {
    cds: metrics.cdsHeight,
    utr: metrics.secondaryExonHeight,
    "noncoding-exon": metrics.secondaryExonHeight,
  };

  return (
    <>
      {introns.map((part, partIndex) => {
        const interval = visiblePixelInterval(part.start, part.end, x, width);
        if (!interval) return null;
        let intronIndex: number | undefined;
        let transcriptionIndex: number | undefined;
        if ("metadata" in part) {
          intronIndex = part.metadata.intronIndex;
          transcriptionIndex = part.metadata.transcriptionIndex;
        }
        return (
          <g key={`intron-${part.start}-${part.end}-${partIndex}`}>
            <line
              data-gene-part={part.kind}
              data-intron-index={intronIndex}
              data-transcription-index={transcriptionIndex}
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
                data-intron-index={intronIndex}
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
      {exonParts.map((part, partIndex) => {
        const interval = visiblePixelInterval(part.start, part.end, x, width);
        if (!interval) return null;
        const height = exonHeights[part.kind];
        let exonIndex: number | undefined;
        let transcriptionIndex: number | undefined;
        let frame: GeneTranscript["exons"][number]["frame"] | undefined;
        let utrSide: string | undefined;
        let contributingTranscriptIds: string | undefined;
        let utrSides: string | undefined;
        if ("winningContributions" in part.metadata) {
          contributingTranscriptIds = part.metadata.winningContributions
            .map((contribution) => contribution.transcriptId)
            .join(",");
          utrSides = part.metadata.utrSides.join(",");
        } else {
          exonIndex = part.metadata.exonIndex;
          transcriptionIndex = part.metadata.transcriptionIndex;
          frame = part.metadata.frame;
          utrSide = part.kind === "utr" ? part.metadata.side : undefined;
        }
        return (
          <rect
            key={`${part.kind}-${part.start}-${part.end}-${partIndex}`}
            data-gene-part={part.kind}
            data-exon-index={exonIndex}
            data-transcription-index={transcriptionIndex}
            data-frame={frame}
            data-utr-side={utrSide}
            data-contributing-transcript-ids={contributingTranscriptIds}
            data-utr-sides={utrSides}
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

function directionMarkPoints(
  x: number,
  y: number,
  halfSize: number,
  strand: GeneTranscript["strand"],
): string {
  const outerX = strand === "+" ? x - halfSize : x + halfSize;
  return `${outerX},${y - halfSize} ${x},${y} ${outerX},${y + halfSize}`;
}
