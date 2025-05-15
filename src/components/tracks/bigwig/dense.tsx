import { useEffect, useMemo, useState } from "react";
import { useBrowserStore } from "../../../store/browserStore";
import { useTrackStore } from "../../../store/trackStore";
import { lighten } from "../../../utils/color";
import { svgPoint } from "../../../utils/svg";
import { TrackDimensions } from "../types";
import { getRange, renderBigWig, renderDense, ytransform } from "./helpers";
import { Tooltip } from "./tooltip";
import {
  BigWigConfig,
  BigWigData,
  BigZoomData,
  Data,
  DataType,
  dataType,
  RenderedBigWigData,
  ValuedPoint,
} from "./types";

interface DenseBigWigProps {
  id: string;
  data: Data;
  color: string;
  height: number;
  dimensions: TrackDimensions;
}

export default function DenseBigWig({ id, data, color, height, dimensions }: DenseBigWigProps) {
  const { multiplier, sideWidth, sidePortion, totalWidth, viewWidth } = dimensions;
  const editTrack = useTrackStore((state) => state.editTrack);
  const delta = useBrowserStore((state) => state.delta);
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const [x, setX] = useState<number>();
  const [value, setValue] = useState<number>();

  const range = useMemo(() => {
    const length = data?.length ?? 0;
    const middleSectionSize = length / multiplier;
    const startIndex = Math.floor(sidePortion * middleSectionSize);
    const endIndex = Math.floor((sidePortion + 1) * middleSectionSize);
    const middleSlice = data?.slice(startIndex, endIndex);
    return getRange(middleSlice ?? []);
  }, [data, multiplier, sidePortion]);

  useEffect(() => {
    editTrack<BigWigConfig>(id, { range: range });
  }, [range, id, editTrack]);

  const rendered: RenderedBigWigData = useMemo(
    () =>
      data && data.length && dataType(data) === DataType.ValuedPoint
        ? renderDense(data as ValuedPoint[])
        : renderBigWig(data as BigWigData[] | BigZoomData[], 100),
    [data, totalWidth]
  );

  const stopColors = useMemo(() => {
    const y = ytransform(range, 1);
    const renderPoints = rendered.renderPoints.filter((v) => v.min < Infinity && v.max > -Infinity);
    return renderPoints.map((point) => {
      const yValue = y(point.max);
      return lighten(color, yValue / 3);
    });
  }, [color, rendered, range]);

  const svgRef = useBrowserStore((state) => state.svgRef);
  const mouseOver = (e: React.MouseEvent<SVGElement>) => {
    if (!svgRef || !svgRef.current) return;
    const pos = svgPoint(svgRef.current, e);
    setX(pos[0]);
    const len = data.length;
    const adjustedX = Math.round(pos[0] - marginWidth);
    const start = len / multiplier;
    const end = start + len / multiplier;
    const x = (adjustedX / viewWidth) * (end - start) + start;
    const point = data[Math.round(x)] as BigWigData;
    setValue(point.value);
  };

  const mouseOut = () => {
    setX(undefined);
  };

  return (
    <g width={totalWidth} height={height} transform={`translate(-${sideWidth}, 0)`}>
      <defs>
        <linearGradient id={id}>
          {stopColors.map((color, i) => (
            <stop key={`${id}_pt_${i}`} offset={`${i}%`} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
      <rect width={totalWidth} x={0} y={height / 3.0} height={height / 3.0} fill={`url('#${id}')`} />
      {/* tooltip */}
      {delta === 0 && (
        <g transform={`translate(${sideWidth}, 0)`}>
          <Tooltip x={x} value={value} trackHeight={height} />
        </g>
      )}
      {/* Interactive area */}
      <rect
        width={viewWidth}
        height={height}
        transform={`translate(${sideWidth}, 0)`}
        fill={"transparent"}
        onMouseMove={(e: React.MouseEvent<SVGElement>) => {
          mouseOver(e);
        }}
        onMouseOut={mouseOut}
      />
    </g>
  );
}
