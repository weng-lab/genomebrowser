import { useMemo, useState } from "react";
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

type Props = BigWigProps & { data: ValuedPoint[] };

export default function FullBigWig(props: Props) {
  const trackWidth = useBrowserStore((state) => state.trackWidth);
  const domain = useBrowserStore((state) => state.domain);
  const [x, setX] = useState<number>();
  const [value, setValue] = useState<number>();

  // Process data once and memoize the result
  const processedData = useMemo(() => {
    const copy = createCopy(props.data);
    const range = props.range || getRange(copy);
    // keep baseline at 0 if min is not negative
    const effectiveRange = {
      min: range.min > 0 ? 0 : range.min,
      max: range.max,
    };
    return clampData(copy, effectiveRange);
  }, [props.data, props.range]);

  const rendered: RenderedBigWigData = useMemo(
    () =>
      processedData && processedData.length && dataType(processedData) === DataType.ValuedPoint
        ? { renderPoints: processedData as ValuedPoint[], range: props.range || getRange(processedData) }
        : renderBigWig(processedData as BigWigData[] | BigZoomData[], trackWidth),
    [processedData, trackWidth, domain]
  );

  const paths: Paths = useMemo(() => {
    const y = ytransform(rendered.range, props.height);
    const renderPoints = rendered.renderPoints.filter((v) => v.min < Infinity && v.max > -Infinity);

    // Pre-calculate the clampY function to avoid repeated calculations
    const clampY = (value: number) => Math.max(0, Math.min(props.height, y(value)));

    // Pre-calculate all y values to avoid repeated calculations
    const yValues = renderPoints.map((point) => ({
      min: clampY(point.min),
      max: clampY(point.max),
    }));

    return {
      maxPath:
        renderPoints.reduce((path, cv, ci) => {
          const prevY = ci > 0 ? yValues[ci - 1].max : clampY(0);
          return path + (cv.x ? l(cv.x, prevY) : "") + l(cv.x, yValues[ci].max);
        }, "M 0 " + clampY(0.0) + " ") + l(trackWidth, clampY(0.0)),

      minPath:
        renderPoints.reduce((path, cv, ci) => {
          const prevY = ci > 0 ? yValues[ci - 1].min : clampY(0);
          return path + (cv.x ? l(cv.x, prevY) : "") + l(cv.x, yValues[ci].min);
        }, "M 0 " + clampY(0.0) + " ") + l(trackWidth, clampY(0.0)),
    };
  }, [rendered, props.height, trackWidth]);

  const color = props.color || "#000000";
  const lightColor = lighten(color, 0.5);

  const svgRef = useBrowserStore((state) => state.svgRef);
  const mouseOver = (e: React.MouseEvent<SVGElement>) => {
    if (!svgRef || !svgRef.current) return;
    const pos = svgPoint(svgRef.current, e);
    setX(pos[0]);
    setValue(props.data.find((p) => p.x === Math.floor(pos[0] - 150))?.min);
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

      <Tooltip x={x} value={value} trackHeight={props.height} />

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
      <rect x={x - marginWidth + 5} y={2} width={35} height={16} fill="white" stroke="#444" strokeWidth={0.5} rx={2} />
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
        {value?.toFixed(3)}
      </text>
    </g>
  );
}
