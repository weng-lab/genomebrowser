import { useEffect, useMemo, useState } from "react";
import { useBrowserStore } from "../../../store/browserStore";
import { lighten } from "../../../utils/color";
import ClipPath from "../../svg/clipPath";
import {
  BigWigData,
  BigZoomData,
  clampData,
  dataType,
  DataType,
  BigWigProps,
  getRange,
  l,
  Paths,
  renderBigWig,
  RenderedBigWigData,
  ValuedPoint,
  ytransform,
  svgPoint,
  createCopy,
} from "./types";
import { useTrackStore } from "../../../store/trackStore";

type Props = BigWigProps & { data: BigWigData[] | undefined };

export default function FullBigWig(props: Props) {
  const trackWidth = useBrowserStore((state) => state.trackWidth);
  const domain = useBrowserStore((state) => state.domain);
  const updateTrack = useTrackStore((state) => state.updateTrack);
  const delta = useBrowserStore((state) => state.delta);

  const [x, setX] = useState<number>();
  const [value, setValue] = useState<number>();

  const range = useMemo(() => {
    return props.range || getRange(props.data ?? []);
  }, [props.data, props.range]);

  useEffect(() => {
    updateTrack(props.id, "range", range);
  }, [props.range]);

  const dataCopy = useMemo(() => createCopy(props.data ?? []), [props.data]);

  const rendered: RenderedBigWigData = useMemo(
    () =>
      dataCopy && dataCopy.length && dataType(dataCopy) === DataType.ValuedPoint
        ? { renderPoints: dataCopy as ValuedPoint[], range: props.range || getRange(dataCopy) }
        : renderBigWig(dataCopy as BigWigData[] | BigZoomData[], trackWidth),
    [dataCopy, trackWidth, domain]
  );

  const paths: Paths = useMemo(() => {
    const y = ytransform(rendered.range, props.height);
    const renderPoints = rendered.renderPoints.filter((v) => v.min < Infinity && v.max > -Infinity);
    const effectiveRange = {
      min: Math.min(range.min, 0),
      max: range.max,
    };
    const clampedData = renderPoints.map((point) => {
      const min = Math.max(point.min, effectiveRange.min);
      const max = Math.min(point.max, effectiveRange.max);
      return {
        x: point.x,
        min: min,
        max: max,
      };
    });

    // Pre-calculate the clampY function to avoid repeated calculations
    const clampY = (value: number) => Math.max(0, Math.min(props.height, y(value)));

    // Pre-calculate all y values to avoid repeated calculations
    const yValues = clampedData.map((point) => ({
      min: clampY(point.min),
      max: clampY(point.max),
    }));

    return {
      maxPath:
        clampedData.reduce((path, cv, ci) => {
          const prevY = ci > 0 ? yValues[ci - 1].max : clampY(0);
          return path + (cv.x ? l(cv.x, prevY) : "") + l(cv.x, yValues[ci].max);
        }, "M 0 " + clampY(0.0) + " ") + l(trackWidth, clampY(0.0)),

      minPath:
        clampedData.reduce((path, cv, ci) => {
          const prevY = ci > 0 ? yValues[ci - 1].min : clampY(0);
          return path + (cv.x ? l(cv.x, prevY) : "") + l(cv.x, yValues[ci].min);
        }, "M 0 " + clampY(0.0) + " ") + l(trackWidth, clampY(0.0)),
    };
  }, [rendered, props.height, trackWidth, range]);

  const color = props.color || "#000000";
  const lightColor = lighten(color, 0.5);

  const svgRef = useBrowserStore((state) => state.svgRef);
  const mouseOver = (e: React.MouseEvent<SVGElement>) => {
    if (!svgRef || !svgRef.current) return;
    const pos = svgPoint(svgRef.current, e);
    setX(pos[0]);
    const adjustedX = Math.round(pos[0] - 150);
    const point = rendered.renderPoints.find((r) => r.min < Infinity && r.max > -Infinity && r.x === adjustedX);
    setValue(point?.max);
  };

  const mouseOut = () => {
    setX(undefined);
  };

  return (
    <g width={trackWidth} height={props.height} clipPath={`url(#${props.id})`}>
      <rect width={trackWidth} height={props.height} fill={"white"} />
      <defs>
        <ClipPath id={props.id} width={trackWidth} height={props.height} />
      </defs>
      <path d={paths.maxPath} fill={lightColor} style={{ cursor: "default", clipPath: `url(#${props.id})` }} />
      <path d={paths.minPath} fill={color} style={{ cursor: "default", clipPath: `url(#${props.id})` }} />

      {delta === 0 && <Tooltip x={x} value={value} trackHeight={props.height} />}

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
    <g>
      <line stroke="#444" x1={x ? x - 150 : 0} x2={x ? x - 150 : 0} y1={0} y2={trackHeight} />
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
    </g>
  );
}
