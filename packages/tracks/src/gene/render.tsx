import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { useMemo } from "react";
import { createGenomicXScale } from "../shared/coordinates";
import { packRows, useRowLayout } from "../shared/layout";
import { createCompositeGeneGeometry, createGeneTranscriptGeometry } from "./geometry";
import { GeneGlyph } from "./glyph";
import { groupTranscriptsByGene } from "./helpers";
import { createGeneLabelLayout, type GeneLabelLayout } from "./labels";
import type { GeneConfig, GeneData, GeneFeature, GeneTranscript, GroupedGene } from "./types";

const interactionBoundsColor = "#ff1744";
const interactionBoundsOpacity = 0.25;
const maximumLabelFontSize = 10;

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
  const labelFontSize = Math.min(maximumLabelFontSize, config.rowHeight);
  const items = visibleFeatures.map((feature) => {
    const start = x(feature.start);
    const end = x(feature.end);
    const label = createGeneLabelLayout(featureLabel(feature), start, end, width, labelFontSize);
    return { feature, label, start, end };
  });
  const rows = packRows(
    items,
    (item) => ({
      start: Math.min(item.start, item.label?.start ?? item.start),
      end: Math.max(item.end, item.label?.end ?? item.end),
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
        row.map(({ feature, label, start: featureStart, end: featureEnd }) => {
          const start = Math.max(0, featureStart);
          const end = Math.min(width, featureEnd);
          const rowTop = rowIndex * rowHeight;
          const featureColor = highlighted(feature, config.geneName)
            ? config.highlightColor
            : color;
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
                  color={featureColor}
                />
                <GeneLabel
                  label={label}
                  color={featureColor}
                  fontSize={labelFontSize}
                  rowTop={rowTop}
                  rowHeight={rowHeight}
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
                color={featureColor}
              />
              <GeneLabel
                label={label}
                color={featureColor}
                fontSize={labelFontSize}
                rowTop={rowTop}
                rowHeight={rowHeight}
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

function GeneLabel({
  label,
  color,
  fontSize,
  rowTop,
  rowHeight,
}: {
  label: GeneLabelLayout | null;
  color: string;
  fontSize: number;
  rowTop: number;
  rowHeight: number;
}) {
  if (!label) return null;
  return (
    <text
      data-gene-label=""
      x={label.x}
      y={rowTop + rowHeight / 2}
      textAnchor={label.anchor}
      dominantBaseline="middle"
      fill={color}
      fontSize={fontSize}
      pointerEvents="none"
      style={{ userSelect: "none" }}
    >
      {label.text}
    </text>
  );
}

function featureLabel(feature: GeneFeature): string {
  return feature.kind === "gene" ? feature.geneName : feature.source.name2 || feature.transcriptId;
}

function highlighted(feature: GeneFeature, query: string | undefined): boolean {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return (
    feature.geneName.toLowerCase().includes(normalizedQuery) ||
    feature.geneId.toLowerCase().includes(normalizedQuery)
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
