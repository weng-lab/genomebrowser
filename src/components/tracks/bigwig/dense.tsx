import { useMemo } from "react";
import { Data, DataType, dataType, RenderedBigWigData } from "./types";
import { BigZoomData } from "./types";
import { ValuedPoint } from "./types";
import { getRange, renderDense } from "./helpers";
import { renderBigWig } from "./helpers";
import { BigWigData } from "./types";
import { ytransform } from "./helpers";
import { lighten } from "../../../utils/color";
import { useBrowserStore } from "../../../store/browserStore";

interface DenseBigWigProps {
  id: string;
  data: Data;
  color: string;
  height: number;
}

export default function DenseBigWig(props: DenseBigWigProps) {
  const w = useBrowserStore((state) => state.trackWidth);
  const multiplier = useBrowserStore((state) => state.multiplier);
  const trackWidth = w * multiplier;
  const sidePiece = (multiplier - 1) / 2;
  const domain = useBrowserStore((state) => state.domain);

  const range = useMemo(() => {
    const length = props.data?.length ?? 0;
    const middleSectionSize = length / multiplier;
    const startIndex = Math.floor(sidePiece * middleSectionSize);
    const endIndex = Math.floor((sidePiece + 1) * middleSectionSize);
    const middleSlice = props.data?.slice(startIndex, endIndex);
    return getRange(middleSlice ?? []);
  }, [props.data, multiplier, sidePiece]);

  const rendered: RenderedBigWigData = useMemo(
    () =>
      props.data && props.data.length && dataType(props.data) === DataType.ValuedPoint
        ? renderDense(props.data as ValuedPoint[])
        : renderBigWig(props.data as BigWigData[] | BigZoomData[], 100),
    [props.data, trackWidth, domain]
  );

  const stopColors = useMemo(() => {
    const y = ytransform(range, 1.0);
    const renderPoints = rendered.renderPoints.filter((v) => v.min < Infinity && v.max > -Infinity);
    const color = props.color;
    return renderPoints.map((point) => {
      const yValue = y(point.max);
      return lighten(color, yValue / 3);
    });
  }, [props.color, rendered, range]);

  return (
    <g width={trackWidth} height={props.height} transform={`translate(-${w * sidePiece}, 0)`}>
      <defs>
        <linearGradient id={props.id}>
          {stopColors.map((color, i) => (
            <stop key={`${props.id}_pt_${i}`} offset={`${i}%`} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
      <rect width={trackWidth} x={0} y={props.height / 3.0} height={props.height / 3.0} fill={`url('#${props.id}')`} />
      {/* tooltip */}
      {/* {delta === 0 && (
        <g transform={`translate(${w * sidePiece}, 0)`}>
          <Tooltip x={x} value={value} trackHeight={props.height} />
        </g>
      )} */}
      {/* Interactive area */}
      <rect
        width={w}
        height={props.height}
        transform={`translate(${w * sidePiece}, 0)`}
        fill={"transparent"}
        // onMouseMove={(e: React.MouseEvent<SVGElement>) => {
        //   // mouseOver(e);
        // }}
        // onMouseOut={mouseOut}
      />
    </g>
  );
}
