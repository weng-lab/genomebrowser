import DenseBigBed from "../bigbed/dense";
import { BulkBedProps, BulkBedRect } from "./types";

export default function BulkBed({
  data,
  datasets,
  id,
  color,
  height,
  dimensions,
  gap = 2,
  onClick,
  onHover,
  onLeave,
  tooltip,
}: BulkBedProps) {
  if (!data || data.length === 0) {
    return null;
  }

  // Calculate instance height based on total height and gap
  const totalGaps = gap * (data.length - 1);
  const instanceHeight = (height - totalGaps) / data.length;

  return (
    <g id={id}>
      {data.map((dataset: BulkBedRect[], i) => {
        const yOffset = i * (instanceHeight + gap);
        const datasetName = datasets[i]?.name || `Dataset ${i + 1}`;

        // Create enhanced handlers that enrich rect with datasetName
        const enhancedOnHover = (rect: any) => {
          const enrichedRect: BulkBedRect = { ...rect, datasetName };
          if (onHover) onHover(enrichedRect);
        };

        const enhancedOnLeave = (rect: any) => {
          const enrichedRect: BulkBedRect = { ...rect, datasetName };
          if (onLeave) onLeave(enrichedRect);
        };

        const enhancedOnClick = (rect: any) => {
          const enrichedRect: BulkBedRect = { ...rect, datasetName };
          if (onClick) onClick(enrichedRect);
        };

        // Create enhanced tooltip that already has datasetName
        const enhancedTooltip = tooltip
          ? (rect: any) => {
              const enrichedRect: BulkBedRect = { ...rect, datasetName };
              return tooltip(enrichedRect);
            }
          : undefined;

        return (
          <g key={`${datasetName}`} transform={`translate(0, ${yOffset})`}>
            <DenseBigBed
              data={dataset}
              id={`${datasetName}`}
              color={color}
              height={instanceHeight}
              dimensions={dimensions}
              verticalPadding={0}
              onClick={enhancedOnClick}
              onHover={enhancedOnHover}
              onLeave={enhancedOnLeave}
              tooltip={enhancedTooltip}
            />
          </g>
        );
      })}
    </g>
  );
}
