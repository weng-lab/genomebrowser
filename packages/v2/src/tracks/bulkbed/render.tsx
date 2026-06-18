import { useTooltip } from "../../browser/tooltip/useTooltip";
import type { TrackRendererProps } from "../../modules/types";
import { createXScale } from "../../modules/utils/scale";
import { renderDenseBigBedData } from "../bigbed/helpers";
import type { BulkBedConfig, BulkBedData, BulkBedRect } from "./types";

export function FullBulkBed({
  config,
  data,
  region,
  width,
  height,
}: TrackRendererProps<BulkBedConfig, BulkBedData>) {
  const x = createXScale(region, width);
  const gap = config.gap ?? 2;
  const totalGaps = gap * Math.max(0, data.length - 1);
  const rowHeight = data.length > 0 ? Math.max(1, (height - totalGaps) / data.length) : height;
  const tooltip = useTooltip<BulkBedRect, BulkBedConfig>({ config });

  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" pointerEvents="none" />
      {data.map((datasetRows, datasetIndex) => {
        const datasetName = config.datasets[datasetIndex]?.name || `Dataset ${datasetIndex + 1}`;
        const yOffset = datasetIndex * (rowHeight + gap);
        const rects = renderDenseBigBedData(datasetRows, x);

        return (
          <g key={datasetName} transform={`translate(0,${yOffset})`}>
            {rects.map((rect, rectIndex) => {
              const existingDatasetName =
                typeof rect.row.datasetName === "string" ? rect.row.datasetName : undefined;
              const row: BulkBedRect = {
                ...rect.row,
                datasetName: existingDatasetName ?? datasetName,
              };

              return (
                <rect
                  key={`${row.start}-${row.end}-${rectIndex}`}
                  x={rect.start}
                  y={0}
                  width={Math.max(1, rect.end - rect.start)}
                  height={rowHeight}
                  fill={rect.color ?? config.color ?? "#4b9560"}
                  style={{ cursor: config.onClick ? "pointer" : "default" }}
                  onClick={(event) => config.onClick?.({ item: row, config, event })}
                  onMouseEnter={(event) => {
                    config.onHover?.({ item: row, config, event });
                    tooltip.show(row, event);
                  }}
                  onMouseLeave={(event) => {
                    config.onLeave?.({ item: row, config, event });
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
