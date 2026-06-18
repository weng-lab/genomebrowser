import { useAutoTrackHeight } from "../../browser/track-height/useAutoTrackHeight";
import { useTooltip } from "../../browser/tooltip/useTooltip";
import type { TrackRendererProps } from "../../modules/types";
import { createXScale } from "../../modules/utils/scale";
import { renderDenseBigBedData, renderSquishBigBedData } from "./helpers";
import type { BigBedConfig, BigBedData } from "./types";

export function DenseBigBed({
  config,
  data,
  region,
  width,
  height,
}: TrackRendererProps<BigBedConfig, BigBedData>) {
  const x = createXScale(region, width);
  const rects = renderDenseBigBedData(data, x);
  const rectHeight = height * 0.6;
  const y = height * 0.2;
  const tooltip = useTooltip<BigBedData[number], BigBedConfig>({ config });

  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" pointerEvents="none" />
      {rects.map((rect, index) => (
        <rect
          key={`${rect.row.start}-${rect.row.end}-${index}`}
          x={rect.start}
          y={y}
          width={Math.max(1, rect.end - rect.start)}
          height={rectHeight}
          fill={rect.color ?? config.color ?? "#4b9560"}
          style={{ cursor: config.onClick ? "pointer" : "default" }}
          onClick={(event) => config.onClick?.({ item: rect.row, config, event })}
          onMouseEnter={(event) => {
            config.onHover?.({ item: rect.row, config, event });
            tooltip.show(rect.row, event);
          }}
          onMouseLeave={(event) => {
            config.onLeave?.({ item: rect.row, config, event });
            tooltip.hide();
          }}
        />
      ))}
    </g>
  );
}

export function SquishBigBed({
  config,
  data,
  region,
  width,
  height,
}: TrackRendererProps<BigBedConfig, BigBedData>) {
  const x = createXScale(region, width);
  const rows = renderSquishBigBedData(data, x);
  const rowHeight = useAutoTrackHeight(config.id, rows.length);
  const tooltip = useTooltip<BigBedData[number], BigBedConfig>({ config });

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
              fill={rect.color ?? config.color ?? "#4b9560"}
              style={{ cursor: config.onClick ? "pointer" : "default" }}
              onClick={(event) => config.onClick?.({ item: rect.row, config, event })}
              onMouseEnter={(event) => {
                config.onHover?.({ item: rect.row, config, event });
                tooltip.show(rect.row, event);
              }}
              onMouseLeave={(event) => {
                config.onLeave?.({ item: rect.row, config, event });
                tooltip.hide();
              }}
            />
          ))}
        </g>
      ))}
    </g>
  );
}
