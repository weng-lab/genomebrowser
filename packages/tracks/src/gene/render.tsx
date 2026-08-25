import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { useMemo } from "react";
import { createGenomicXScale } from "../shared/coordinates";
import { packRows, useRowLayout } from "../shared/layout";
import {
  createCompositeGeneGeometry,
  createGeneTranscriptGeometry,
  type CompositeGeneExonPart,
  type CompositeGeneIntronRun,
  type GeneExonPart,
  type GeneIntronPart,
} from "./geometry";
import { groupTranscriptsByGene } from "./helpers";
import type { GeneConfig, GeneData, GeneFeature, GeneTranscript, GroupedGene } from "./types";

const interactionBoundsColor = "#ff1744";
const interactionBoundsOpacity = 0.25;

export function PackGene(props: TrackRendererProps<GeneConfig, GeneData>) {
  return <GeneRows {...props} features={props.data} />;
}

export function SquishGene(props: TrackRendererProps<GeneConfig, GeneData>) {
  const genes = useMemo(() => groupTranscriptsByGene(props.data), [props.data]);
  return <GeneRows {...props} features={genes} />;
}

function GeneRows({
  id,
  config,
  color,
  region,
  width,
  features,
}: TrackRendererProps<GeneConfig, GeneData> & { features: readonly GeneFeature[] }) {
  const x = createGenomicXScale(region, width);
  const visibleFeatures = features.filter(
    (feature) => feature.end > region.start && feature.start < region.end,
  );
  const rows = packRows(
    visibleFeatures,
    (feature) => ({
      start: x(feature.start),
      end: x(feature.end),
    }),
    { gap: 4 },
  );
  const { rowHeight, trackHeight } = useRowLayout(id, rows.length, config);
  const interaction = useInteraction<GeneFeature>();
  const tooltip = useTooltip<GeneFeature, GeneConfig>();

  return (
    <g>
      <rect width={width} height={trackHeight} fill="#ffffff" pointerEvents="none" />
      {rows.map((row, rowIndex) =>
        row.map((feature) => {
          const start = Math.max(0, x(feature.start));
          const end = Math.min(width, x(feature.end));
          const rowTop = rowIndex * rowHeight;
          const handleMouseEnter = (event: React.MouseEvent<SVGElement>) => {
            interaction?.onHover?.(feature);
            tooltip.show(feature, event);
          };
          const handleMouseLeave = () => {
            interaction?.onLeave?.(feature);
            tooltip.hide();
          };
          const interactionProps = {
            style: { cursor: interaction?.onClick ? "pointer" : "default" },
            onClick: () => interaction?.onClick?.(feature),
            onMouseEnter: handleMouseEnter,
            onMouseLeave: handleMouseLeave,
          };
          const key = `${feature.kind}-${feature.chromosome}-${feature.start}-${feature.end}-${feature.kind === "gene" ? feature.geneId : feature.transcriptId}`;

          if (feature.kind === "transcript") {
            return (
              <g key={key}>
                <TranscriptParts
                  transcript={feature}
                  x={x}
                  width={width}
                  rowTop={rowTop}
                  rowHeight={rowHeight}
                  color={color}
                />
                <rect
                  data-transcript-hit-target=""
                  x={start}
                  y={rowTop}
                  width={Math.max(2, end - start)}
                  height={rowHeight}
                  fill={interactionBoundsColor}
                  fillOpacity={interactionBoundsOpacity}
                  style={interactionProps.style}
                  onClick={interactionProps.onClick}
                  onMouseEnter={interactionProps.onMouseEnter}
                  onMouseLeave={interactionProps.onMouseLeave}
                />
              </g>
            );
          }

          return (
            <g key={key}>
              <CompositeGeneParts
                gene={feature}
                x={x}
                width={width}
                rowTop={rowTop}
                rowHeight={rowHeight}
                color={color}
              />
              <rect
                data-gene-hit-target=""
                x={start}
                y={rowTop}
                width={Math.max(2, end - start)}
                height={rowHeight}
                fill={interactionBoundsColor}
                fillOpacity={interactionBoundsOpacity}
                style={interactionProps.style}
                onClick={interactionProps.onClick}
                onMouseEnter={interactionProps.onMouseEnter}
                onMouseLeave={interactionProps.onMouseLeave}
              />
            </g>
          );
        }),
      )}
    </g>
  );
}

function TranscriptParts({
  transcript,
  x,
  width,
  rowTop,
  rowHeight,
  color,
}: {
  transcript: GeneTranscript;
  x: (position: number) => number;
  width: number;
  rowTop: number;
  rowHeight: number;
  color: string;
}) {
  return (
    <PartGlyphs
      geometry={createGeneTranscriptGeometry(transcript)}
      strand={transcript.strand}
      x={x}
      width={width}
      rowTop={rowTop}
      rowHeight={rowHeight}
      color={color}
    />
  );
}

function CompositeGeneParts({
  gene,
  x,
  width,
  rowTop,
  rowHeight,
  color,
}: {
  gene: GroupedGene;
  x: (position: number) => number;
  width: number;
  rowTop: number;
  rowHeight: number;
  color: string;
}) {
  const geometry = useMemo(() => createCompositeGeneGeometry(gene), [gene]);
  return (
    <PartGlyphs
      geometry={{ introns: geometry.intronRuns, exonParts: geometry.exonParts }}
      strand={gene.strand}
      x={x}
      width={width}
      rowTop={rowTop}
      rowHeight={rowHeight}
      color={color}
    />
  );
}

type RenderableGeometry = {
  introns: readonly (GeneIntronPart | CompositeGeneIntronRun)[];
  exonParts: readonly (GeneExonPart | CompositeGeneExonPart)[];
};

function PartGlyphs({
  geometry,
  strand,
  x,
  width,
  rowTop,
  rowHeight,
  color,
}: {
  geometry: RenderableGeometry;
  strand: GeneTranscript["strand"];
  x: (position: number) => number;
  width: number;
  rowTop: number;
  rowHeight: number;
  color: string;
}) {
  const center = rowTop + rowHeight / 2;
  const exonHeights: Record<GeneExonPart["kind"], number> = {
    cds: Math.max(1, rowHeight * 0.7),
    utr: Math.max(1, rowHeight * 0.4),
    "noncoding-exon": Math.max(1, rowHeight * 0.4),
  };

  return (
    <>
      {geometry.introns.map((part, partIndex) => {
        const interval = visiblePixelInterval(part.start, part.end, x, width);
        if (!interval) return null;
        const markHalfSize = Math.min(3, rowHeight * 0.2);
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
              strokeWidth={Math.max(1, rowHeight * 0.08)}
              pointerEvents="none"
            />
            {directionMarkCenters(interval.start, interval.end).map((markCenter) => (
              <polyline
                key={markCenter}
                data-intron-direction-mark=""
                data-intron-index={intronIndex}
                points={directionMarkPoints(markCenter, center, markHalfSize, strand)}
                fill="none"
                stroke={color}
                strokeWidth={Math.max(1, rowHeight * 0.08)}
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
                aria-hidden="true"
              />
            ))}
          </g>
        );
      })}
      {geometry.exonParts.map((part, partIndex) => {
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

function directionMarkCenters(start: number, end: number): number[] {
  const width = end - start;
  if (width < 6) return [];
  const count = Math.max(1, Math.floor(width / 24));
  const spacing = width / (count + 1);
  return Array.from({ length: count }, (_, index) => start + spacing * (index + 1));
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
