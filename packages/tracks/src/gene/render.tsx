import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { useMemo } from "react";
import { createGenomicXScale } from "../shared/coordinates";
import { packRows, useRowLayout } from "../shared/layout";
import { createCompositeGeneGeometry, createGeneTranscriptGeometry } from "./geometry";
import { GeneGlyph } from "./glyph";
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
                <TranscriptGlyph
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
              <CompositeGeneGlyph
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

function TranscriptGlyph({
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
  const geometry = useMemo(() => createGeneTranscriptGeometry(transcript), [transcript]);
  return (
    <GeneGlyph
      introns={geometry.introns}
      exonParts={geometry.exonParts}
      strand={transcript.strand}
      x={x}
      width={width}
      rowTop={rowTop}
      rowHeight={rowHeight}
      color={color}
    />
  );
}

function CompositeGeneGlyph({
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
    <GeneGlyph
      introns={geometry.intronRuns}
      exonParts={geometry.exonParts}
      strand={gene.strand}
      x={x}
      width={width}
      rowTop={rowTop}
      rowHeight={rowHeight}
      color={color}
    />
  );
}
