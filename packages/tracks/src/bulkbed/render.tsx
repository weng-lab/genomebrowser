import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { renderDenseBigBedData } from "../bigbed/helpers";
import { createXScale } from "../shared/scale";
import type { BulkBedConfig, BulkBedData, BulkBedRect } from "./types";

export function FullBulkBed({
  config,
  color,
  data,
  region,
  width,
  height,
}: TrackRendererProps<BulkBedConfig, BulkBedData>) {
  const x = createXScale(region, width);
  const gap = config.gap ?? 2;
  const rowHeight =
    data.length > 0
      ? Math.max(1, (height - gap * Math.max(0, data.length - 1)) / data.length)
      : height;
  const interaction = useInteraction<BulkBedRect>();
  const tooltip = useTooltip<BulkBedRect, BulkBedConfig>();
  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" pointerEvents="none" />
      {data.map((datasetRows, datasetIndex) => {
        const datasetName = config.datasets[datasetIndex]?.name || `Dataset ${datasetIndex + 1}`;
        return (
          <g key={datasetName} transform={`translate(0,${datasetIndex * (rowHeight + gap)})`}>
            {renderDenseBigBedData(datasetRows, x).map((rect, rectIndex) => {
              const row: BulkBedRect = {
                ...rect.row,
                datasetName:
                  typeof rect.row.datasetName === "string" ? rect.row.datasetName : datasetName,
              };
              return (
                <rect
                  key={`${row.start}-${row.end}-${rectIndex}`}
                  x={rect.start}
                  y={0}
                  width={Math.max(1, rect.end - rect.start)}
                  height={rowHeight}
                  fill={rect.color ?? color}
                  style={{ cursor: interaction?.onClick ? "pointer" : "default" }}
                  onClick={() => interaction?.onClick?.(row)}
                  onMouseEnter={(event) => {
                    interaction?.onHover?.(row);
                    tooltip.show(row, event);
                  }}
                  onMouseLeave={() => {
                    interaction?.onLeave?.(row);
                    tooltip.hide();
                  }}
                />
              );
            })}
          </g>
        );
      })}
    </g>
  );
}
