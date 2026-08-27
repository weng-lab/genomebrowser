import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { useMemo } from "react";
import { createGenomicXScale } from "../shared/coordinates";
import { packRows, useRowLayout } from "../shared/layout";
import { GeneGlyph } from "./glyph";
import { findTranscriptTagColor, groupTranscriptsByGene } from "./helpers";
import type { GeneInteractionTarget } from "./interactions";
import { createGeneLabelLayout, type GeneLabelLayout } from "./labels";
import {
  prepareGeneTranscriptGlyph,
  prepareMergedGeneGlyph,
  type PreparedGeneGlyph,
} from "./preparation";
import type { GeneConfig, GeneData, GeneFeature } from "./types";

const maximumLabelFontSize = 10;

export function FullGene(props: TrackRendererProps<GeneConfig, GeneData>) {
  return <GeneRows {...props} features={props.data} />;
}

export function TaggedGene(props: TrackRendererProps<GeneConfig, GeneData>) {
  const transcripts = useMemo(
    () =>
      props.data.filter((transcript) => findTranscriptTagColor(transcript, props.config.tagColors)),
    [props.config.tagColors, props.data],
  );
  return <GeneRows {...props} features={transcripts} />;
}

export function MergedGene(props: TrackRendererProps<GeneConfig, GeneData>) {
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
  const preparedFeatures = useMemo(
    () =>
      new Map(
        features.map((feature) => [
          feature,
          feature.kind === "transcript"
            ? prepareGeneTranscriptGlyph(feature)
            : prepareMergedGeneGlyph(feature),
        ]),
      ),
    [features],
  );
  const visibleFeatures = features.filter(
    (feature) => feature.end > region.start && feature.start < region.end,
  );
  const labelFontSize = Math.min(maximumLabelFontSize, config.rowHeight);
  const items = visibleFeatures.map((feature) => {
    const start = x(feature.start);
    const end = x(feature.end);
    const label = createGeneLabelLayout(featureLabel(feature), start, end, width, labelFontSize);
    return { feature, label, prepared: preparedFeatures.get(feature)!, start, end };
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
  const interaction = useInteraction<GeneInteractionTarget>();
  const tooltip = useTooltip<GeneInteractionTarget, GeneConfig>();

  return (
    <g>
      <rect width={width} height={trackHeight} fill="#ffffff" pointerEvents="none" />
      {rows.map((row, rowIndex) =>
        row.map(({ feature, label, prepared, start: featureStart, end: featureEnd }) => {
          const start = Math.max(0, featureStart);
          const end = Math.min(width, featureEnd);
          const rowTop = rowIndex * rowHeight;
          const featureColor = highlighted(feature, config.geneName)
            ? config.highlightColor
            : feature.kind === "transcript"
              ? (findTranscriptTagColor(feature, config.tagColors) ?? color)
              : color;
          const interactionProps = (target: GeneInteractionTarget) => ({
            style: { cursor: interaction?.onClick ? "pointer" : "default" },
            onClick: () => interaction?.onClick?.(target),
            onMouseEnter: (event: React.MouseEvent<SVGElement>) => {
              interaction?.onHover?.(target);
              tooltip.show(target, event);
            },
            onMouseLeave: () => {
              interaction?.onLeave?.(target);
              tooltip.hide();
            },
          });
          const featureTarget: GeneInteractionTarget =
            feature.kind === "transcript"
              ? { kind: "transcript", feature }
              : { kind: "gene", feature };
          const featureInteractionProps = interactionProps(featureTarget);
          const key = `${feature.kind}-${feature.chromosome}-${feature.start}-${feature.end}-${feature.kind === "gene" ? feature.geneId : feature.transcriptId}`;

          return (
            <g key={key}>
              <rect
                {...(feature.kind === "transcript"
                  ? { "data-transcript-hit-target": "" }
                  : { "data-gene-hit-target": "" })}
                x={start}
                y={rowTop}
                width={Math.max(2, end - start)}
                height={rowHeight}
                fill="transparent"
                pointerEvents="all"
                style={featureInteractionProps.style}
                onClick={featureInteractionProps.onClick}
                onMouseEnter={featureInteractionProps.onMouseEnter}
                onMouseLeave={featureInteractionProps.onMouseLeave}
              />
              <GeneGlyph
                geometry={prepared.geometry}
                strand={feature.strand}
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
              <GenePartHitTargets
                prepared={prepared}
                x={x}
                width={width}
                rowTop={rowTop}
                rowHeight={rowHeight}
                interactionProps={interactionProps}
              />
            </g>
          );
        }),
      )}
    </g>
  );
}

function GenePartHitTargets({
  prepared,
  x,
  width,
  rowTop,
  rowHeight,
  interactionProps,
}: {
  prepared: PreparedGeneGlyph;
  x: (position: number) => number;
  width: number;
  rowTop: number;
  rowHeight: number;
  interactionProps: (target: GeneInteractionTarget) => {
    style: { cursor: string };
    onClick: () => void;
    onMouseEnter: (event: React.MouseEvent<SVGElement>) => void;
    onMouseLeave: () => void;
  };
}) {
  return [...prepared.geometry.introns, ...prepared.geometry.exonParts].map((part) => {
    const start = Math.max(0, x(part.start));
    const end = Math.min(width, x(part.end));
    if (end <= 0 || start >= width || end <= start) return null;
    const target = prepared.targets.get(part.id);
    if (!target) return null;
    const handlers = interactionProps(target);
    return (
      <rect
        key={part.id}
        data-gene-part-hit-target=""
        data-gene-part-id={part.id}
        x={start}
        y={rowTop}
        width={Math.max(1, end - start)}
        height={rowHeight}
        fill="transparent"
        pointerEvents="all"
        style={handlers.style}
        onClick={handlers.onClick}
        onMouseEnter={handlers.onMouseEnter}
        onMouseLeave={handlers.onMouseLeave}
      />
    );
  });
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
  return feature.kind === "gene" ? feature.geneName : feature.transcriptName;
}

function highlighted(feature: GeneFeature, query: string | undefined): boolean {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return (
    feature.geneName.toLowerCase().includes(normalizedQuery) ||
    feature.geneId.toLowerCase().includes(normalizedQuery)
  );
}
