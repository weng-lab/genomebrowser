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

type Props = BigWigProps & { data: BigWigData[] | undefined };

export default function FullBigWig(props: Props) {
  const w = useBrowserStore((state) => state.trackWidth);
  const trackWidth = w * 3;
  const domain = useBrowserStore((state) => state.domain);
  const updateTrack = useTrackStore((state) => state.updateTrack);
  const delta = useBrowserStore((state) => state.delta);
  const marginWidth = useBrowserStore((state) => state.marginWidth);

  const [x, setX] = useState<number>();
  const [value, setValue] = useState<number>();

  const range = useMemo(() => {
    const length = props.data?.length ?? 0;
    const slice = props.data?.slice(length / 3, (2 * length) / 3);
    return getRange(slice ?? []);
  }, [props.data]);

  useEffect(() => {
    if (props.range?.max === range?.max && props.range?.min === range?.min) return;
    updateTrack(props.id, "range", range);
  }, [range, props.id, updateTrack]);

  const dataCopy = useMemo(() => createCopy(props.data ?? []), [props.data]);

  const rendered: RenderedBigWigData = useMemo(
    () =>
      dataCopy && dataCopy.length && dataType(dataCopy) === DataType.ValuedPoint
        ? { renderPoints: dataCopy as ValuedPoint[], range: props.range || getRange(dataCopy) }
        : renderBigWig(dataCopy as BigWigData[] | BigZoomData[], trackWidth),
    [dataCopy, trackWidth, domain]
  );

  const paths: Paths = useMemo(() => {
    const renderPoints = rendered.renderPoints.filter((v) => v.min < Infinity && v.max > -Infinity);

    const y = ytransform(range, props.height);
    const clampY = (value: number) => Math.max(0, Math.min(props.height, y(value)));

    const yValues = renderPoints.map((point) => {
      const clampedY = clampY(point.min);
      return {
        value: clampedY,
        isClamped: point.min > range.max
      };
    });

    // Generate the main path
    const path = renderPoints.reduce((path, cv, ci) => {
      const prevY = ci > 0 ? yValues[ci - 1].value : clampY(0);
      return path + (cv.x ? l(cv.x, prevY) : "") + l(cv.x, yValues[ci].value);
    }, "M 0 " + clampY(0.0) + " ") + l(trackWidth, clampY(0.0));

    // Generate clamped markers
    const clampedMarkers = renderPoints.map((point, i) => {
      if (yValues[i].isClamped) {
        return `M ${point.x} 0 l 0 2`;
      }
      return '';
    }).join(' ');

    return {
      path,
      clampedMarkers
    };
  }, [rendered, props.height, trackWidth, range]);

  const svgRef = useBrowserStore((state) => state.svgRef);
  const mouseOver = (e: React.MouseEvent<SVGElement>) => {
    if (!svgRef || !svgRef.current) return;
    const pos = svgPoint(svgRef.current, e);
    setX(pos[0]);
    const len = rendered.renderPoints.length;
    const adjustedX = Math.round(pos[0] - marginWidth) + Math.floor(len / 3);
    const point = rendered.renderPoints.find((r) => r.min < Infinity && r.max > -Infinity && r.x === adjustedX);
    setValue(point?.max);
  };

  const mouseOut = () => {
    setX(undefined);
  };

  return (
    <g width={trackWidth} height={props.height} clipPath={`url(#${props.id})`} transform={`translate(-${w}, 0)`}>
      <rect width={trackWidth} height={props.height} fill={"white"} />
      <defs>
        <ClipPath id={props.id} width={trackWidth} height={props.height} />
      </defs>
      <path d={paths.path} fill={props.color || "#000000"} style={{ clipPath: `url(#${props.id})` }} />
      <path d={paths.clampedMarkers} stroke="red" strokeWidth="1" fill="none" />
      {/* tooltip */}
      {delta === 0 && (
        <g transform={`translate(${w}, 0)`}>
          <Tooltip x={x} value={value} trackHeight={props.height} />
        </g>
      )}
      {/* Interactive area */}
      <rect
        width={trackWidth}
        height={props.height}
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
