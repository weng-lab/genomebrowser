import { createElement, useEffect, useMemo } from "react";
import ClipPath from "../../svg/clipPath";
import { TrackDimensions } from "../types";
import { BigBedConfig, Rect, SquishRect } from "./types";
import { useXTransform } from "../../../hooks/useXTransform";
import { renderSquishBigBedData } from "./helpers";
import { useTrackStore } from "../../../store/trackStore";
import { useTheme } from "../../../store/themeStore";
import { useTooltipStore } from "../../../store/tooltipStore";

interface SquishBigBedProps {
  id: string;
  data: Rect[];
  color: string;
  rowHeight: number;
  dimensions: TrackDimensions;
  onClick?: (rect: Rect) => void;
  onHover?: (rect: Rect) => void;
  onLeave?: () => void;
  tooltip?: React.FC<Rect>;
}

const MINIMUM_HEIGHT = 12;
export default function SquishBigBed({
  id,
  data,
  rowHeight,
  dimensions,
  color,
  onClick,
  onHover,
  onLeave,
  tooltip,
}: SquishBigBedProps) {
  const { totalWidth, sideWidth } = dimensions;
  const { background, text } = useTheme();

  const x = useXTransform(totalWidth);
  const editTrack = useTrackStore((state) => state.editTrack);

  const rendered: SquishRect[][] = useMemo(() => {
    const d = data ? [...data] : [];
    return renderSquishBigBedData(d, x);
  }, [data, x]);

  const height = rowHeight * rendered.length || MINIMUM_HEIGHT;

  useEffect(() => {
    editTrack<BigBedConfig>(id, { height });
  }, [height, id, editTrack]);

  const handleClick = (rect: Rect) => {
    if (onClick) {
      onClick(rect);
    }
  };

  const showTooltip = useTooltipStore((state) => state.showTooltip);
  const hideTooltip = useTooltipStore((state) => state.hideTooltip);
  const handleMouseOver = (rect: Rect, e: React.MouseEvent<SVGGElement>) => {
    if (onHover) {
      onHover(rect);
    }
    let content = <text fill={text}>{rect.name}</text>;
    if (tooltip) {
      content = createElement(tooltip, rect);
    }
    showTooltip(content, e.clientX, e.clientY);
  };

  const handleMouseOut = () => {
    if (onLeave) {
      onLeave();
    }
    hideTooltip();
  };

  return (
    <g width={totalWidth} height={height} clipPath={`url(#${id})`} transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill={background} />
      <defs>
        <ClipPath id={id} width={totalWidth} height={height} />
      </defs>
      {rendered.map((group, i) => (
        <g transform={`translate(0, ${i * rowHeight})`} key={`group_${i}`}>
          {group.map((rect, j) => (
            <rect
              style={{ cursor: onClick ? "pointer" : "default" }}
              key={`${id}_${j}`}
              height={rowHeight * 0.6}
              width={rect.end - rect.start < 1 ? 1 : rect.end - rect.start}
              x={rect.start}
              y={rowHeight * 0.2}
              fill={rect.color || color}
              onClick={() => handleClick(rect)}
              onMouseOver={(e) => handleMouseOver(rect, e)}
              onMouseOut={() => handleMouseOut()}
            />
          ))}
        </g>
      ))}
    </g>
  );
}
