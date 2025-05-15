import { useMemo } from "react";
import { Rect } from "./types";
import ClipPath from "../../svg/clipPath";
import { renderDenseBigBedData } from "./helpers";
import { TrackDimensions } from "../types";
import { useXTransform } from "../../../hooks/useXTransform";

interface DenseBigBedProps {
  height: number;
  data: Rect[];
  color: string;
  id: string;
  dimensions: TrackDimensions;
}

function DenseBigBed({ id, data, height, color, dimensions }: DenseBigBedProps) {
  const { totalWidth, sideWidth } = dimensions;
  const x = useXTransform(totalWidth);

  const rendered: Rect[] = useMemo(() => {
    return renderDenseBigBedData(data || [], x);
  }, [data, x]);

  return (
    <g width={totalWidth} height={height} clipPath={`url(#${id})`} transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill={"white"} />
      <defs>
        <ClipPath id={id} width={totalWidth} height={height} />
      </defs>
      {rendered.map((rect, i) => (
        <rect
          // style={{ cursor: props.onClick ? "pointer" : "default" }}
          key={`${id}_${i}`}
          height={height * 0.6}
          width={rect.end - rect.start}
          x={rect.start}
          y={height * 0.2}
          fill={rect.color || color}
          // onClick={() => props.onClick && props.onClick(rect)}
          // onMouseOut={() => {
          //   props.onMouseOut && props.onMouseOut();
          //   mouseOut();
          // }}
          // onMouseOver={(e: React.MouseEvent<SVGRectElement>) => {
          //   e.persist();
          //   props.onMouseOver && props.onMouseOver(rect);
          //   mouseOver(e, rect);
          // }}
        />
      ))}
    </g>
  );
}
export default DenseBigBed;
