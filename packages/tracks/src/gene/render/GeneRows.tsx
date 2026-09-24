import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { createGenomicXScale } from "../../shared/coordinates";
import { useRowLayout } from "../../shared/layout";
import { packViewportRows } from "../../shared/layout/viewportRows";
import { intersectsVisibleRegion } from "../../shared/viewport";
import type { GeneInteractionTarget } from "../interactions";
import type { GeneConfig, GeneData, GeneFeature } from "../types";
import { findTranscriptTagColor } from "./features";
import { GeneLabel } from "./GeneLabel";
import { GenePartHitTargets } from "./GenePartHitTargets";
import { GeneGlyph } from "./glyph/GeneGlyph";
import { prepareGeneTranscriptGlyph, prepareMergedGeneGlyph } from "./glyph/preparation";
import { createGeneLabelLayout } from "./labels";

const maximumLabelFontSize = 10;

/** Packs features into rows and draws each one with its glyph, label, and hit targets. */
export function GeneRows({
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
