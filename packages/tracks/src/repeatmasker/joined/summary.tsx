import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { useRowLayout } from "../../shared/layout";
import { createGenomicXScale } from "../../shared/coordinates";
import { coverageCells } from "../coverage";
import type { BigRmskConfig } from "./schema";
import type { BigRmskSummaryData, BigRmskSummaryItem } from "./types";

export function BigRmskSummary({
  id,
  config,
  data,
  region,
  visibleRegion,
  width,
}: TrackRendererProps<BigRmskConfig, BigRmskSummaryData>) {
  const { rowHeight, trackHeight } = useRowLayout(id, 1, config);
  const interaction = useInteraction<BigRmskSummaryItem>();
  const tooltip = useTooltip<BigRmskSummaryItem, BigRmskConfig>();
  const x = createGenomicXScale(region, width);
  return (
    <g data-bigrmsk-summary="">
      <rect width={width} height={trackHeight} fill="transparent" pointerEvents="none" />
      {coverageCells(data, region, width).map((cell) => {
        const item: BigRmskSummaryItem = { ...cell.item, kind: "joined-summary" };
        return (
          <g
            key={cell.key}
            data-repeatmasker-summary=""
            onClick={() => interaction?.onClick?.(item)}
            onMouseEnter={(event) => {
              interaction?.onHover?.(item);
              tooltip.show(item, event);
            }}
            onMouseLeave={() => {
              interaction?.onLeave?.(item);
              tooltip.hide();
            }}
          >
            <rect
              x={cell.x}
              y={rowHeight * 0.45}
              width={cell.width}
              height={rowHeight * 0.45}
              fill={cell.fill}
            />
          </g>
        );
      })}
      <text
        x={Math.max(0, x(visibleRegion.start)) + 3}
        y={rowHeight * 0.35}
        fontSize={Math.min(10, config.rowHeight * 0.4)}
      >
        Zoom in for individual repeats
      </text>
    </g>
  );
}
