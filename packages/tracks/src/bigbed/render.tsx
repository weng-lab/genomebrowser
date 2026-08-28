import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { createGenomicXScale } from "../shared/coordinates";
import { useRowLayout } from "../shared/layout";
import { intersectsVisibleRegion } from "../shared/viewport";
import { renderDenseBigBedData, renderSquishBigBedData } from "./helpers";
import type { BigBedConfig, BigBedRow } from "./types";

export function DenseBigBed<
  Row extends BigBedRow = BigBedRow,
  Config extends BigBedConfig = BigBedConfig,
>({ id, config, color, data, region, width }: TrackRendererProps<Config, Row[]>) {
  const x = createGenomicXScale(region, width);
  const rects = renderDenseBigBedData(data, x);
  const { rowHeight, trackHeight } = useRowLayout(id, 1, config);
  const interaction = useInteraction<Row>();
  const tooltip = useTooltip<Row, Config>();
  return (
    <g>
      <rect width={width} height={trackHeight} fill="#ffffff" pointerEvents="none" />
      {rects.map((rect, index) => (
        <rect
          key={`${rect.row.start}-${rect.row.end}-${index}`}
          x={rect.start}
          y={rowHeight * 0.2}
          width={Math.max(1, rect.end - rect.start)}
          height={rowHeight * 0.6}
          fill={rect.color ?? color}
          style={{ cursor: interaction?.onClick ? "pointer" : "default" }}
          onClick={() => interaction?.onClick?.(rect.row)}
          onMouseEnter={(event) => {
            interaction?.onHover?.(rect.row);
            tooltip.show(rect.row, event);
          }}
          onMouseLeave={() => {
            interaction?.onLeave?.(rect.row);
            tooltip.hide();
          }}
        />
      ))}
    </g>
  );
}

export function SquishBigBed<
  Row extends BigBedRow = BigBedRow,
  Config extends BigBedConfig = BigBedConfig,
>({ id, config, color, data, visibleRegion, region, width }: TrackRendererProps<Config, Row[]>) {
  const packed = renderSquishBigBedData(data, createGenomicXScale(region, width), (row) =>
    intersectsVisibleRegion(row, visibleRegion),
  );
  const { rowHeight, trackHeight } = useRowLayout(id, packed.visibleRowCount, config);
  const interaction = useInteraction<Row>();
  const tooltip = useTooltip<Row, Config>();
  return (
    <g>
      <rect width={width} height={trackHeight} fill="#ffffff" pointerEvents="none" />
      {packed.rows.map((row, rowIndex) => (
        <g key={rowIndex} transform={`translate(0,${rowIndex * rowHeight})`}>
          {row.map((rect, rectIndex) => (
            <rect
              key={`${rect.row.start}-${rect.row.end}-${rectIndex}`}
              x={rect.start}
              y={rowHeight * 0.2}
              width={Math.max(1, rect.end - rect.start)}
              height={rowHeight * 0.6}
              fill={rect.color ?? color}
              style={{ cursor: interaction?.onClick ? "pointer" : "default" }}
              onClick={() => interaction?.onClick?.(rect.row)}
              onMouseEnter={(event) => {
                interaction?.onHover?.(rect.row);
                tooltip.show(rect.row, event);
              }}
              onMouseLeave={() => {
                interaction?.onLeave?.(rect.row);
                tooltip.hide();
              }}
            />
          ))}
        </g>
      ))}
    </g>
  );
}
