import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { renderDenseBigBedData } from "../bigbed/helpers";
import { createGenomicXScale } from "../shared/coordinates";
import { useRowLayout } from "../shared/layout";
import { intersectsVisibleRegion } from "../shared/viewport";
import type { BulkBedConfig, BulkBedData, BulkBedRect } from "./types";

export function FullBulkBed({
  id,
  config,
  color,
  data,
  visibleRegion,
  region,
  width,
}: TrackRendererProps<BulkBedConfig, BulkBedData>) {
  const x = createGenomicXScale(region, width);
  const gap = config.gap ?? 2;
  const datasets = data.map((rows, index) => ({
    rows,
    name: config.datasets[index]?.name || `Dataset ${index + 1}`,
  }));
  const visibleDatasets = datasets.filter(({ rows }) =>
    rows.some((row) => intersectsVisibleRegion(row, visibleRegion)),
  );
  const overscanDatasets = datasets.filter(({ rows }) =>
    rows.every((row) => !intersectsVisibleRegion(row, visibleRegion)),
  );
  const renderData = [...visibleDatasets, ...overscanDatasets];
  const { rowHeight, trackHeight } = useRowLayout(id, visibleDatasets.length, config);
  const contentHeight = Math.max(0, rowHeight - gap);
  const interaction = useInteraction<BulkBedRect>();
  const tooltip = useTooltip<BulkBedRect, BulkBedConfig>();
  return (
    <g>
      <rect width={width} height={trackHeight} fill="#ffffff" pointerEvents="none" />
      {renderData.map(({ rows: datasetRows, name: datasetName }, datasetIndex) => {
        return (
          <g key={datasetName} transform={`translate(0,${datasetIndex * rowHeight})`}>
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
                  height={contentHeight}
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
