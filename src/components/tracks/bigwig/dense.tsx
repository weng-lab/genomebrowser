import { useMemo, useState } from "react";
import { Data, DataType, dataType, RenderedBigWigData } from "./types";
import { BigZoomData } from "./types";
import { ValuedPoint } from "./types";
import { getRange, renderDense } from "./helpers";
import { renderBigWig } from "./helpers";
import { BigWigData } from "./types";
import { ytransform } from "./helpers";
import { lighten } from "../../../utils/color";
import { useBrowserStore } from "../../../store/browserStore";
import { TrackDimensions } from "../types";
import { svgPoint } from "../../../utils/svg";
import { Tooltip } from "./tooltip";

interface DenseBigWigProps {
  id: string;
  data: Data;
  color: string;
  height: number;
  dimensions: TrackDimensions;
}

export default function DenseBigWig(props: DenseBigWigProps) {
  const { multiplier, sideWidth, sidePortion, totalWidth, viewWidth } = props.dimensions;
  const delta = useBrowserStore((state) => state.delta);
  const domain = useBrowserStore((state) => state.domain);
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const [x, setX] = useState<number>();
  const [value, setValue] = useState<number>();

  const range = useMemo(() => {
    const length = props.data?.length ?? 0;
    const middleSectionSize = length / multiplier;
    const startIndex = Math.floor(sidePortion * middleSectionSize);
    const endIndex = Math.floor((sidePortion + 1) * middleSectionSize);
    const middleSlice = props.data?.slice(startIndex, endIndex);
    return getRange(middleSlice ?? []);
  }, [props.data, multiplier, sidePortion]);

  const rendered: RenderedBigWigData = useMemo(
    () =>
      props.data && props.data.length && dataType(props.data) === DataType.ValuedPoint
        ? renderDense(props.data as ValuedPoint[])
        : renderBigWig(props.data as BigWigData[] | BigZoomData[], 100),
    [props.data, totalWidth, domain]
  );

  const stopColors = useMemo(() => {
    const y = ytransform(range, 1);
    const renderPoints = rendered.renderPoints.filter((v) => v.min < Infinity && v.max > -Infinity);
    const color = props.color;
    return renderPoints.map((point) => {
      const yValue = y(point.max);
      return lighten(color, yValue / 3);
    });
  }, [props.color, rendered, range]);

  const svgRef = useBrowserStore((state) => state.svgRef);
  const mouseOver = (e: React.MouseEvent<SVGElement>) => {
    if (!svgRef || !svgRef.current) return;
    const pos = svgPoint(svgRef.current, e);
    setX(pos[0]);
    const len = props.data.length;
    const adjustedX = Math.round(pos[0] - marginWidth);
    const start = len / multiplier;
    const end = start + len / multiplier;
    const x = (adjustedX / viewWidth) * (end - start) + start;
    const point = props.data[Math.round(x)] as BigWigData;
    setValue(point.value);
  };

  const mouseOut = () => {
    setX(undefined);
  };

  return (
    <g width={totalWidth} height={props.height} transform={`translate(-${sideWidth}, 0)`}>
      <defs>
        <linearGradient id={props.id}>
          {stopColors.map((color, i) => (
            <stop key={`${props.id}_pt_${i}`} offset={`${i}%`} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
      <rect width={totalWidth} x={0} y={props.height / 3.0} height={props.height / 3.0} fill={`url('#${props.id}')`} />
      {/* tooltip */}
      {delta === 0 && (
        <g transform={`translate(${sideWidth}, 0)`}>
          <Tooltip x={x} value={value} trackHeight={props.height} />
        </g>
      )}
      {/* Interactive area */}
      <rect
        width={viewWidth}
        height={props.height}
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
