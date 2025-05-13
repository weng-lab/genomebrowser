import { useEffect, useMemo, useState } from "react";
import { useBrowserStore } from "../../../store/browserStore";
import ClipPath from "./clipPath";

import {
  BigWigData,
  BigZoomData,
  ValuedPoint,
  dataType,
  DataType,
  BigWigProps,
  Paths,
  RenderedBigWigData,
} from "./types";

import { useTrackStore } from "../../../store/trackStore";
import { createCopy, getRange, l, renderBigWig, ytransform } from "./helpers";
import { svgPoint } from "../../../utils/svg";
import { TrackDimensions } from "../types";

type Props = BigWigProps & { data: BigWigData[] | undefined; dimensions: TrackDimensions };

export default function FullBigWig({ data, range, id, height, color, dimensions }: Props) {
  const domain = useBrowserStore((state) => state.domain);
  const updateTrack = useTrackStore((state) => state.updateTrack);
  const delta = useBrowserStore((state) => state.delta);
  const marginWidth = useBrowserStore((state) => state.marginWidth);

  const [x, setX] = useState<number>();
  const [value, setValue] = useState<number>();

  const realRange = useMemo(() => {
    const length = data?.length ?? 0;
    const middleSectionSize = length / dimensions.multiplier;
    const startIndex = Math.floor(dimensions.sidePortion * middleSectionSize);
    const endIndex = Math.floor((dimensions.sidePortion + 1) * middleSectionSize);
    const middleSlice = data?.slice(startIndex, endIndex);
    return getRange(middleSlice ?? []);
  }, [data, dimensions.multiplier, dimensions.sidePortion]);

  useEffect(() => {
    if (range?.max === range?.max && range?.min === range?.min) return;
    updateTrack(id, "range", realRange);
  }, [realRange, id, updateTrack]);

  const dataCopy = useMemo(() => createCopy(data ?? []), [data]);

  const rendered: RenderedBigWigData = useMemo(
    () =>
      dataCopy && dataCopy.length && dataType(dataCopy) === DataType.ValuedPoint
        ? { renderPoints: dataCopy as ValuedPoint[], range: range || getRange(dataCopy) }
        : renderBigWig(dataCopy as BigWigData[] | BigZoomData[], dimensions.totalWidth),
    [dataCopy, dimensions.totalWidth, domain]
  );

  const paths: Paths = useMemo(() => {
    const renderPoints = rendered.renderPoints.filter((v) => v.min < Infinity && v.max > -Infinity);

    const y = ytransform(realRange, height);
    const clampY = (value: number) => Math.max(0, Math.min(height, y(value)));

    const yValues = renderPoints.map((point) => {
      const clampedY = clampY(point.min);
      return {
        value: clampedY,
        isClamped: point.min > realRange.max,
      };
    });

    // Generate the main path
    const path =
      renderPoints.reduce((path, cv, ci) => {
        const prevY = ci > 0 ? yValues[ci - 1].value : clampY(0);
        return path + (cv.x ? l(cv.x, prevY) : "") + l(cv.x, yValues[ci].value);
      }, "M 0 " + clampY(0.0) + " ") + l(dimensions.totalWidth, clampY(0.0));

    // Generate clamped markers
    const clampedMarkers = renderPoints
      .map((point, i) => {
        if (yValues[i].isClamped) {
          return `M ${point.x} 0 l 0 2`;
        }
        return "";
      })
      .join(" ");

    return {
      path,
      clampedMarkers,
    };
  }, [rendered, height, dimensions.viewWidth, realRange]);

  const svgRef = useBrowserStore((state) => state.svgRef);
  const mouseOver = (e: React.MouseEvent<SVGElement>) => {
    if (!svgRef || !svgRef.current) return;
    const pos = svgPoint(svgRef.current, e);
    setX(pos[0]);
    const len = rendered.renderPoints.length;
    const middleSectionSize = len / dimensions.multiplier;
    const adjustedX = Math.round(pos[0] - marginWidth) + Math.floor(dimensions.sidePortion * middleSectionSize);
    const point = rendered.renderPoints.find((r) => r.min < Infinity && r.max > -Infinity && r.x === adjustedX);
    setValue(point?.max);
  };

  const mouseOut = () => {
    setX(undefined);
  };

  return (
    <g
      width={dimensions.totalWidth}
      height={height}
      clipPath={`url(#${id})`}
      transform={`translate(-${dimensions.sideWidth}, 0)`}
    >
      <rect width={dimensions.totalWidth} height={height} fill={"white"} />
      <defs>
        <ClipPath id={id} width={dimensions.totalWidth} height={height} />
      </defs>
      <path d={paths.path} fill={color || "#000000"} style={{ clipPath: `url(#${id})` }} />
      <path d={paths.clampedMarkers} stroke="red" strokeWidth="1" fill="none" />
      {/* tooltip */}
      {delta === 0 && (
        <g transform={`translate(${dimensions.sideWidth}, 0)`}>
          <Tooltip x={x} value={value} trackHeight={height} />
        </g>
      )}
      {/* Interactive area */}
      <rect
        width={dimensions.viewWidth}
        height={height}
        transform={`translate(${dimensions.sideWidth}, 0)`}
        fill={"transparent"}
        onMouseMove={(e: React.MouseEvent<SVGElement>) => {
          mouseOver(e);
        }}
        onMouseOut={mouseOut}
      />
    </g>
  );
}

function Tooltip({ x, value, trackHeight }: { x: number | undefined; value: number | undefined; trackHeight: number }) {
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  if (!x) return null;
  return (
    <>
      <line stroke="#444" x1={x ? x - marginWidth : 0} x2={x ? x - marginWidth : 0} y1={0} y2={trackHeight} />
      {/* Background rectangle */}
      <rect
        x={x - marginWidth + 5}
        y={2}
        width={value ? value.toFixed(2).length * 6 + 1 : 0}
        height={16}
        fill="white"
        stroke="#444"
        strokeWidth={0.5}
        rx={2}
      />
      <text
        x={x - marginWidth + 7}
        y={15}
        fill="#444"
        fontSize={12}
        style={{
          visibility: value !== undefined ? "visible" : "hidden",
          userSelect: "none",
        }}
      >
        {value?.toFixed(2)}
      </text>
    </>
  );
}
