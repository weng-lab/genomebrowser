import {
  useAutoTrackHeight,
  useInteraction,
  useTooltip,
  type TrackRendererProps,
} from "@weng-lab/genomebrowser";
import { createXScale } from "../shared/scale";
import { renderDenseBigBedData, renderSquishBigBedData } from "./helpers";
import type { BigBedConfig, BigBedRow } from "./types";

export function DenseBigBed<
  Row extends BigBedRow = BigBedRow,
  Config extends BigBedConfig = BigBedConfig,
>({ color, data, region, width, height }: TrackRendererProps<Config, Row[]>) {
  const x = createXScale(region, width);
  const rects = renderDenseBigBedData(data, x);
  const interaction = useInteraction<Row>();
  const tooltip = useTooltip<Row, Config>();
  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" pointerEvents="none" />
      {rects.map((rect, index) => (
        <rect
          key={`${rect.row.start}-${rect.row.end}-${index}`}
          x={rect.start}
          y={height * 0.2}
          width={Math.max(1, rect.end - rect.start)}
          height={height * 0.6}
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
>({ id, color, data, region, width, height }: TrackRendererProps<Config, Row[]>) {
  const rows = renderSquishBigBedData(data, createXScale(region, width));
  const rowHeight = useAutoTrackHeight(id, rows.length);
  const interaction = useInteraction<Row>();
  const tooltip = useTooltip<Row, Config>();
  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" pointerEvents="none" />
      {rows.map((row, rowIndex) => (
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
