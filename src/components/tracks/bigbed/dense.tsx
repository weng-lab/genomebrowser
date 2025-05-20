import { useMemo } from "react";
import { Rect } from "./types";
import ClipPath from "../../svg/clipPath";
import { renderDenseBigBedData } from "./helpers";
import { TrackDimensions } from "../types";
import { useXTransform } from "../../../hooks/useXTransform";
import { useTheme } from "../../../store/themeStore";

interface DenseBigBedProps {
  height: number;
  data: Rect[];
  color: string;
  id: string;
  dimensions: TrackDimensions;
  onClick?: (rect: Rect) => void;
  onMouseOver?: (rect: Rect) => void;
  onMouseOut?: (rect: Rect) => void;
}

function DenseBigBed({ id, data, height, color, dimensions, onClick, onMouseOver, onMouseOut }: DenseBigBedProps) {
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

  const handleMouseOver = (rect: Rect) => {
    if (onMouseOver) {
      onMouseOver(rect);
    }
  };

  const handleMouseOut = (rect: Rect) => {
    if (onMouseOut) {
      onMouseOut(rect);
    }
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
          onMouseOver={() => handleMouseOver(rect)}
          onMouseOut={() => handleMouseOut(rect)}
        />
      ))}
    </g>
  );
}
export default DenseBigBed;
