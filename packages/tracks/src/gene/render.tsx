import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { memo, useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { createGenomicXScale } from "../shared/coordinates";
import { useRowLayout } from "../shared/layout";
import { packViewportRows } from "../shared/layout/viewportRows";
import { intersectsVisibleRegion } from "../shared/viewport";
import { GeneGlyph as GeneGlyphComponent } from "./glyph";
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
const GeneGlyph = memo(GeneGlyphComponent);

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
  visibleRegion,
  region,
  width,
  features,
}: TrackRendererProps<GeneConfig, GeneData> & { features: readonly GeneFeature[] }) {
  // Glyphs, labels, and hit targets depend only on the data region and width, which
  // stay the same when a pan moves the visible region inside the loaded data. Keeping
  // their props stable lets the memoized children skip those renders.
  const x = useMemo(() => createGenomicXScale(region, width), [region, width]);
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
  const labelFontSize = Math.min(maximumLabelFontSize, config.rowHeight);
  const items = useMemo(
    () =>
      features
        .filter((feature) => feature.end > region.start && feature.start < region.end)
        .map((feature) => {
          const start = x(feature.start);
          const end = x(feature.end);
          const label = createGeneLabelLayout(
            featureLabel(feature),
            start,
            end,
            width,
            labelFontSize,
          );
          return { feature, label, prepared: preparedFeatures.get(feature)!, start, end };
        }),
    [features, labelFontSize, preparedFeatures, region, width, x],
  );
  const packed = packViewportRows(
    items,
    (item) => ({
      start: Math.min(item.start, item.label?.start ?? item.start),
      end: Math.max(item.end, item.label?.end ?? item.end),
    }),
    (item) => intersectsVisibleRegion(item.feature, visibleRegion),
    { gap: 4 },
  );
  const { rowHeight, trackHeight } = useRowLayout(id, packed.visibleRowCount, config);
  const rowIndexes = new Map(
    packed.rows.flatMap((row, rowIndex) => row.map((item) => [item, rowIndex] as const)),
  );
  const interaction = useInteraction<GeneInteractionTarget>();
  const tooltip = useTooltip<GeneInteractionTarget, GeneConfig>();
  // Handlers read the latest interaction and tooltip, so their identity can stay stable.
  // The cursor is visible output, so it comes from this render and changes the identity.
  const handlersRef = useRef({ interaction, tooltip });
  useLayoutEffect(() => {
    handlersRef.current = { interaction, tooltip };
  });
  const clickable = Boolean(interaction?.onClick);
  const interactionProps = useCallback(
    (target: GeneInteractionTarget) => ({
      style: { cursor: clickable ? "pointer" : "default" },
      onClick: () => handlersRef.current.interaction?.onClick?.(target),
      onMouseEnter: (event: React.MouseEvent<SVGElement>) => {
        handlersRef.current.interaction?.onHover?.(target);
        handlersRef.current.tooltip.show(target, event);
      },
      onMouseLeave: () => {
        handlersRef.current.interaction?.onLeave?.(target);
        handlersRef.current.tooltip.hide();
      },
    }),
    [clickable],
  );

  return (
    <g>
      <rect width={width} height={trackHeight} fill="transparent" pointerEvents="none" />
      {/* Render in data order and place rows by transform: re-packing rows after a pan
          then only moves groups, without remounting or reordering them. Rows never
          overlap, so the drawing order between them doesn't matter. */}
      {items.map((item) => {
        const rowIndex = rowIndexes.get(item);
        if (rowIndex === undefined) return null;
        const { feature, label, prepared, start: featureStart, end: featureEnd } = item;
        const start = Math.max(0, featureStart);
        const end = Math.min(width, featureEnd);
        const rowTop = rowIndex * rowHeight;
        const featureColor = highlighted(feature, config.geneName)
          ? config.highlightColor
          : feature.kind === "transcript"
            ? (findTranscriptTagColor(feature, config.tagColors) ?? color)
            : color;
        const featureTarget: GeneInteractionTarget =
          feature.kind === "transcript"
            ? { kind: "transcript", feature }
            : { kind: "gene", feature };
        const featureInteractionProps = interactionProps(featureTarget);
        const key = `${feature.kind}-${feature.chromosome}-${feature.start}-${feature.end}-${feature.kind === "gene" ? feature.geneId : feature.transcriptId}`;

        return (
          // Rows move by transform, so a re-packed row doesn't change its children's props.
          <g key={key} transform={rowTop ? `translate(0,${rowTop})` : undefined}>
            <rect
              {...(feature.kind === "transcript"
                ? { "data-transcript-hit-target": "" }
                : { "data-gene-hit-target": "" })}
              x={start}
              y={0}
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
              rowTop={0}
              rowHeight={rowHeight}
              color={featureColor}
            />
            <GeneLabel
              label={label}
              color={featureColor}
              fontSize={labelFontSize}
              rowTop={0}
              rowHeight={rowHeight}
            />
            <GenePartHitTargets
              prepared={prepared}
              x={x}
              width={width}
              rowTop={0}
              rowHeight={rowHeight}
              interactionProps={interactionProps}
            />
          </g>
        );
      })}
    </g>
  );
}

const GenePartHitTargets = memo(function GenePartHitTargets({
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
});

const GeneLabel = memo(function GeneLabel({
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
});

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
