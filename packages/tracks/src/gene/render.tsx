import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { createGenomicXScale } from "../shared/coordinates";
import { packRows, useRowLayout } from "../shared/layout";
import { groupTranscriptsByGene } from "./helpers";
import type { GeneConfig, GeneData, GeneFeature } from "./types";

export function PackGene(props: TrackRendererProps<GeneConfig, GeneData>) {
  return <GeneRows {...props} features={props.data} />;
}

export function SquishGene(props: TrackRendererProps<GeneConfig, GeneData>) {
  return <GeneRows {...props} features={groupTranscriptsByGene(props.data)} />;
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
  const rectangleHeight = Math.max(1, rowHeight * 0.7);

  return (
    <g>
      <rect width={width} height={trackHeight} fill="#ffffff" pointerEvents="none" />
      {rows.map((row, rowIndex) =>
        row.map((feature) => {
          const start = Math.max(0, x(feature.start));
          const end = Math.min(width, x(feature.end));
          return (
            <rect
              key={`${feature.kind}-${feature.chromosome}-${feature.start}-${feature.end}-${feature.kind === "gene" ? feature.geneId : feature.transcriptId}`}
              x={start}
              y={rowIndex * rowHeight + (rowHeight - rectangleHeight) / 2}
              width={Math.max(2, end - start)}
              height={rectangleHeight}
              rx={Math.min(2, rectangleHeight / 4)}
              fill={color}
              style={{ cursor: interaction?.onClick ? "pointer" : "default" }}
              onClick={() => interaction?.onClick?.(feature)}
              onMouseEnter={(event) => {
                interaction?.onHover?.(feature);
                tooltip.show(feature, event);
              }}
              onMouseLeave={() => {
                interaction?.onLeave?.(feature);
                tooltip.hide();
              }}
            />
          );
        }),
      )}
    </g>
  );
}
