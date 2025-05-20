import { createElement, useMemo } from "react";
import { Rect } from "./types";
import ClipPath from "../../svg/clipPath";
import { renderDenseBigBedData } from "./helpers";
import { TrackDimensions } from "../types";
import { useXTransform } from "../../../hooks/useXTransform";
import { useTheme } from "../../../store/themeStore";
import { useTooltip } from "../../../hooks/useTooltip";

interface DenseBigBedProps {
  height: number;
  data: Rect[];
  color: string;
  id: string;
  dimensions: TrackDimensions;
  onClick?: (rect: Rect) => void;
  onHover?: (rect: Rect) => void;
  onLeave?: (rect: Rect) => void;
  tooltip?: React.FC<Rect>;
}

function DenseBigBed({ id, data, height, color, dimensions, onClick, onHover, onLeave, tooltip }: DenseBigBedProps) {
  const { totalWidth, sideWidth } = dimensions;
  const x = useXTransform(totalWidth);

  const rendered: Rect[] = useMemo(() => {
    return renderDenseBigBedData(data || [], x);
  }, [data, x]);

  const { background } = useTheme();

  const handleClick = (rect: Rect) => {
    if (onClick) {
      onClick(rect);
    }
  };

  const { show, hide } = useTooltip();
  const handleMouseOver = (rect: Rect, e: React.MouseEvent<SVGGElement>) => {
    if (onHover) {
      onHover(rect);
    }
    let content = createElement(defaultTooltip, rect);
    if (tooltip) {
      content = createElement(tooltip, rect);
    }
    show(e, content);
  };

  const handleMouseOut = (rect: Rect) => {
    if (onLeave) {
      onLeave(rect);
    }
    hide();
  };

  return (
    <g width={totalWidth} height={height} clipPath={`url(#${id})`} transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill={background} />
      <defs>
        <ClipPath id={id} width={totalWidth} height={height} />
      </defs>
      {rendered.map((rect, i) => (
        <rect
          style={{ cursor: onClick ? "pointer" : "default" }}
          key={`${id}_${i}`}
          height={height * 0.6}
          width={rect.end - rect.start}
          x={rect.start}
          y={height * 0.2}
          fill={rect.color || color}
          onClick={() => handleClick(rect)}
          onMouseOver={(e) => handleMouseOver(rect, e)}
          onMouseOut={() => handleMouseOut(rect)}
        />
      ))}
    </g>
  );
}
export default DenseBigBed;

function defaultTooltip(rect: Rect) {
  return <div>{rect.name}</div>;
}
