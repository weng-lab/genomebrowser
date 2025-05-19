import { useEffect, useMemo } from "react";
import ClipPath from "../../svg/clipPath";
import { TrackDimensions } from "../types";
import { BigBedConfig, Rect, SquishRect } from "./types";
import { useXTransform } from "../../../hooks/useXTransform";
import { renderSquishBigBedData } from "./helpers";
import { useTrackStore } from "../../../store/trackStore";
import { useTheme } from "../../../store/themeStore";

interface SquishBigBedProps {
  id: string;
  data: Rect[];
  rowHeight: number;
  dimensions: TrackDimensions;
}

// onClick: (rect: Rect) => void;
// onMouseOver: (rect: Rect) => void;
// onMouseOut: () => void;

const MINIMUM_HEIGHT = 12;
export default function SquishBigBed({ id, data, rowHeight, dimensions }: SquishBigBedProps) {
  const { totalWidth, sideWidth } = dimensions;
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

  const { background } = useTheme();

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
              // style={{ cursor: props.onClick ? "pointer" : "default" }}
              key={`${id}_${j}`}
              height={rowHeight * 0.6}
              width={rect.end - rect.start < 1 ? 1 : rect.end - rect.start}
              x={rect.start}
              y={rowHeight * 0.2}
              fill={rect.color}
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
      ))}
    </g>
  );
}
