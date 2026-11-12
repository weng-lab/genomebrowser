import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { createGenomicXScale } from "../../shared/coordinates";
import { useRowLayout } from "../../shared/layout";
import { packViewportRows } from "../../shared/layout/viewportRows";
import { repeatColor } from "./presentation";
import type { BigRmskConfig } from "./schema";
import type { BigRmskData, BigRmskRepeat } from "./types";

type Props = TrackRendererProps<BigRmskConfig, BigRmskData>;
type Mode = "dense" | "pack" | "full";

export function DenseBigRmsk(props: Props) {
  return <RepeatRows {...props} mode="dense" />;
}

export function PackedBigRmsk(props: Props) {
  return <RepeatRows {...props} mode="pack" />;
}

export function FullBigRmsk(props: Props) {
  return <RepeatRows {...props} mode="full" />;
}

function RepeatRows({
  id,
  config,
  data,
  region,
  visibleRegion,
  width,
  mode,
}: Props & { mode: Mode }) {
  const x = createGenomicXScale(region, width);
  const fontSize = Math.min(10, config.rowHeight * 0.4);
  const showLabels = mode !== "dense" && config.showLabels;
  const showExtents = mode === "full" && config.showUnalignedExtents;
  const items = data
    .filter((repeat) => repeat.alignedBlocks.length > 0)
    .map((repeat) => {
      const start = x(repeat.thickStart);
      const end = x(repeat.thickEnd);
      const leading =
        showExtents && repeat.blockStarts[0] === -1 ? Math.max(0, repeat.blockSizes[0]!) : 0;
      const trailing =
        showExtents && repeat.blockStarts[repeat.blockCount - 1] === -1
          ? Math.max(0, repeat.blockSizes[repeat.blockCount - 1]!)
          : 0;
      const before = Math.min(120, Math.abs(x(repeat.thickStart) - x(repeat.thickStart - leading)));
      const after = Math.min(120, Math.abs(x(repeat.thickEnd + trailing) - x(repeat.thickEnd)));
      const labelStart = Math.max(0, start);
      const maxCharacters = Math.max(0, Math.floor((width - labelStart) / (fontSize * 0.6)));
      const label =
        !showLabels || maxCharacters < 2 || end <= 0 || start >= width
          ? ""
          : repeat.repeatName.length <= maxCharacters
            ? repeat.repeatName
            : `${repeat.repeatName.slice(0, maxCharacters - 1)}\u2026`;
      return {
        repeat,
        alignedIndexes: repeat.blockStarts.flatMap((offset, index) => (offset >= 0 ? [index] : [])),
        start,
        end,
        leading,
        trailing,
        before,
        after,
        label,
        labelStart,
        bounds: {
          start: start - before,
          end: Math.max(end + after, labelStart + label.length * fontSize * 0.6),
        },
      };
    })
    .filter((item) => item.bounds.end > 0 && item.bounds.start < width);
  const isVisible = (item: (typeof items)[number]) =>
    item.bounds.end > x(visibleRegion.start) && item.bounds.start < x(visibleRegion.end);
  const packed =
    mode === "dense"
      ? { rows: [items], visibleRowCount: 1 }
      : mode === "full"
        ? {
            rows: [...items.filter(isVisible), ...items.filter((item) => !isVisible(item))].map(
              (item) => [item],
            ),
            visibleRowCount: items.filter(isVisible).length,
          }
        : packViewportRows(items, (item) => item.bounds, isVisible, { gap: 5 });
  const rowIndexes = new Map(
    packed.rows.flatMap((row, index) => row.map((item) => [item, index] as const)),
  );
  const { rowHeight, trackHeight } = useRowLayout(id, packed.visibleRowCount, config);
  const interaction = useInteraction<BigRmskRepeat>();
  const tooltip = useTooltip<BigRmskRepeat, BigRmskConfig>();
  const glyphY = showLabels || mode === "full" ? rowHeight * 0.5 : rowHeight * 0.2;
  const glyphHeight = showLabels || mode === "full" ? rowHeight * 0.4 : rowHeight * 0.6;
  const middle = glyphY + glyphHeight / 2;

  return (
    <g>
      <rect width={width} height={trackHeight} fill="transparent" pointerEvents="none" />
      {items.map((item) => {
        const { repeat } = item;
        const color = repeatColor(repeat);
        const start = Math.max(0, item.start);
        const end = Math.min(width, item.end);
        const rowIndex = rowIndexes.get(item)!;
        const shade = Math.round(40 + 190 * Math.min(1, repeat.score / 1000));
        return (
          <g
            key={`${repeat.chromosome}-${repeat.id}-${repeat.start}-${repeat.end}`}
            data-bigrmsk-repeat={repeat.id}
            aria-label={`${repeat.repeatName} ${repeat.repeatClass}${repeat.repeatFamily ? `/${repeat.repeatFamily}` : ""}, strand ${repeat.strand}`}
            transform={`translate(0,${rowIndex * rowHeight})`}
            style={{ cursor: interaction?.onClick ? "pointer" : "default" }}
            onClick={() => interaction?.onClick?.(repeat)}
            onMouseEnter={(event) => {
              interaction?.onHover?.(repeat);
              tooltip.show(repeat, event);
            }}
            onMouseLeave={() => {
              interaction?.onLeave?.(repeat);
              tooltip.hide();
            }}
          >
            {end > start && (
              <rect
                x={start}
                y={glyphY}
                width={Math.max(1, end - start)}
                height={glyphHeight}
                fill="transparent"
                pointerEvents="all"
              />
            )}
            {mode !== "dense" &&
              repeat.alignedBlocks.slice(1).map((block, index) => {
                const previous = repeat.alignedBlocks[index]!;
                const left = Math.max(0, Math.min(width, x(previous.end)));
                const right = Math.max(0, Math.min(width, x(block.start)));
                const previousIndex = item.alignedIndexes[index]!;
                const nextIndex = item.alignedIndexes[index + 1]!;
                const consensusGap = repeat.blockSizes
                  .slice(previousIndex + 1, nextIndex)
                  .reduce((sum, size) => sum + size, 0);
                return (
                  <path
                    key={`${previousIndex}-${nextIndex}`}
                    data-bigrmsk-join=""
                    data-consensus-gap={consensusGap}
                    d={
                      consensusGap < 0
                        ? `M ${left} ${middle} L ${(left + right) / 2} ${glyphY - 2} L ${right} ${middle}`
                        : `M ${left} ${middle} L ${right} ${middle}`
                    }
                    fill="none"
                    stroke={color}
                    strokeWidth={1}
                    strokeDasharray={consensusGap > 0 ? "3 2" : undefined}
                  />
                );
              })}
            {repeat.alignedBlocks.map((block, index) => {
              if (x(block.end) <= 0 || x(block.start) >= width) return null;
              const left = Math.max(0, x(block.start));
              const right = Math.min(width, x(block.end));
              const blockWidth = Math.max(1, right - left);
              const sourceBlockIndex = item.alignedIndexes[index]!;
              const arrows =
                mode === "dense"
                  ? undefined
                  : strandArrows(left, glyphY, blockWidth, glyphHeight, repeat.strand);
              return (
                <g key={sourceBlockIndex}>
                  <rect
                    data-bigrmsk-block=""
                    x={left}
                    y={glyphY}
                    width={blockWidth}
                    height={glyphHeight}
                    fill={mode === "full" ? `rgb(${shade},${shade},${shade})` : color}
                    stroke={mode === "dense" ? undefined : color}
                    strokeWidth={mode === "dense" ? undefined : 0.8}
                  />
                  {arrows && (
                    <path
                      data-bigrmsk-strand={repeat.strand}
                      d={arrows}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth={1}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pointerEvents="none"
                      aria-hidden="true"
                    />
                  )}
                </g>
              );
            })}
            {item.label && (
              <text
                x={item.labelStart}
                y={rowHeight * 0.3}
                fontSize={fontSize}
                fill={color}
                data-bigrmsk-label=""
              >
                {item.label}
              </text>
            )}
            {showExtents && item.leading > 0 && (
              <ConsensusExtent
                start={Math.max(0, item.start - item.before)}
                end={Math.max(0, item.start)}
                length={item.leading}
                y={rowHeight * 0.3}
                middle={middle}
                fontSize={fontSize}
                color={color}
                side="left"
              />
            )}
            {showExtents && item.trailing > 0 && (
              <ConsensusExtent
                start={Math.min(width, item.end)}
                end={Math.min(width, item.end + item.after)}
                length={item.trailing}
                y={rowHeight * 0.3}
                middle={middle}
                fontSize={fontSize}
                color={color}
                side="right"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

function strandArrows(x: number, y: number, width: number, height: number, strand: "+" | "-") {
  if (width < 8 || height < 4) return undefined;
  const halfSize = Math.min(2.5, height / 2 - 1);
  const count = Math.max(1, Math.floor(width / 10));
  const spacing = width / (count + 1);
  const middle = y + height / 2;
  const direction = strand === "+" ? 1 : -1;
  return Array.from({ length: count }, (_, index) => {
    const center = x + spacing * (index + 1);
    const outer = center - direction * halfSize;
    const tip = center + direction * halfSize;
    return `M ${outer} ${middle - halfSize} L ${tip} ${middle} L ${outer} ${middle + halfSize}`;
  }).join(" ");
}

function ConsensusExtent({
  start,
  end,
  length,
  y,
  middle,
  fontSize,
  color,
  side,
}: {
  start: number;
  end: number;
  length: number;
  y: number;
  middle: number;
  fontSize: number;
  color: string;
  side: "left" | "right";
}) {
  if (end - start < 2) return null;
  const anchor = side === "left" ? end : start;
  const cap = side === "left" ? start : end;
  return (
    <g data-bigrmsk-context="" aria-label={`${length} bp unaligned consensus`}>
      <path
        d={`M ${cap} ${y - 2} V ${y + 2} M ${start} ${y} H ${end} M ${anchor} ${y} V ${middle}`}
        fill="none"
        stroke={color}
        strokeDasharray="3 2"
      />
      {end - start > 45 && (
        <text
          x={(start + end) / 2}
          y={y - 2}
          textAnchor="middle"
          fontSize={Math.max(1, fontSize * 0.8)}
          fill={color}
        >
          {length.toLocaleString("en-US")} bp
        </text>
      )}
    </g>
  );
}
