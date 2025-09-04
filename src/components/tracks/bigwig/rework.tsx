import { useMemo } from "react";
import { useMouseToIndex } from "../../../hooks/useMousePosition";
import { useBrowserStore, useTheme } from "../../../store/BrowserContext";
import { l, m } from "../../../utils/svg";
import ClipPath from "../../svg/clipPath";
import { FullBigWigProps, ValuedPoint, YRange } from "./types";
import useInteraction from "../../../hooks/useInteraction";
import { lighten } from "../../../utils/color";

export default function ReworkBigWig({ data, customRange, id, height, color, dimensions, tooltip }: FullBigWigProps) {
  const { sideWidth, totalWidth, viewWidth } = dimensions;

  const svgRef = useBrowserStore((state) => state.svgRef);
  const delta = useBrowserStore((state) => state.delta);
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const backgroundColor = useTheme((state) => state.background);

  const hasNegatives = useMemo(() => {
    return data.some((point) => (point as ValuedPoint).min < 0);
  }, [data]);

  const signals = useMemo(() => {
    return generateSignal(data as ValuedPoint[], height, color, customRange, backgroundColor);
  }, [data, height, color, customRange]);

  const { mouseState, updateMouseState, clearMouseState } = useMouseToIndex(svgRef, totalWidth, marginWidth, sideWidth);

  const linePosition = useMemo(() => {
    return mouseState.pos?.x ? mouseState.pos.x - marginWidth + sideWidth : 0;
  }, [mouseState.pos?.x, marginWidth, sideWidth]);

  const background = useTheme((state) => state.background);
  const text = useTheme((state) => state.text);

  const { handleHover, handleLeave } = useInteraction({
    onClick: undefined,
    onHover: undefined,
    onLeave: undefined,
    tooltip: tooltip,
  });

  return (
    <g width={totalWidth} height={height} clipPath={`url(#${id})`} transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill={background} />
      <defs>
        <ClipPath id={id} width={totalWidth} height={height} />
      </defs>
      {signals}
      {!delta && linePosition && <line stroke={text} x1={linePosition} x2={linePosition} y1={0} y2={height} />}
      <rect
        width={viewWidth}
        height={height}
        transform={`translate(${sideWidth}, 0)`}
        fill={"transparent"}
        onMouseMove={(e) => {
          updateMouseState(e);
          if (mouseState.index === null) return;
          const max = (data[mouseState.index] as ValuedPoint).max;
          const min = (data[mouseState.index] as ValuedPoint).min;
          if (!max || !min) return;
          if (max === min || !hasNegatives) {
            handleHover(max, String(max.toFixed(2)), e);
            return;
          }
          handleHover(max, "max: " + String(max.toFixed(2)) + " min: " + String(min.toFixed(2)), e);
        }}
        onMouseOut={() => {
          clearMouseState();
          handleLeave({});
        }}
      />
    </g>
  );
}

/**
 * Draw to the point's position, at the zeroPoint, then draw up to it's value, over 1 pixel, then back down.
 * Drawing to the zeroPoint is necessart to ensure proper rendering of null values.
 */
function generateSignal(data: ValuedPoint[], height: number, color: string, range?: YRange, backgroundColor?: string) {
  const dataRange = {
    min: data.map((point) => point.min).reduce((a, b) => Math.min(a, b), Infinity),
    max: data.map((point) => point.max).reduce((a, b) => Math.max(a, b), -Infinity),
  };
  const currentRange = range || dataRange;
  const zeroPoint = height - linearScale(0, currentRange, { min: 0, max: height });

  let minPath = m(0, zeroPoint);
  let maxPath = m(0, zeroPoint);
  let clampHigh = m(0, 0);
  let clampLow = m(0, height);

  data.forEach((point) => {
    const minY = linearScale(point.min, currentRange, { min: 0, max: height });
    const maxY = linearScale(point.max, currentRange, { min: 0, max: height });

    minPath +=
      l(point.x, zeroPoint) + l(point.x, height - minY) + l(point.x + 1, height - minY) + l(point.x + 1, zeroPoint);
    maxPath +=
      l(point.x, zeroPoint) + l(point.x, height - maxY) + l(point.x + 1, height - maxY) + l(point.x + 1, zeroPoint);

    if (range && point.min < range.min) {
      clampLow += m(point.x, height) + l(point.x, height) + l(point.x + 1, height);
    }
    if (range && point.max > range.max) {
      clampHigh += m(point.x, 0) + l(point.x, 0) + l(point.x + 1, 0);
    }
  });

  return (
    <>
      {currentRange.min < 0 ? <path d={minPath} fill={lighten(color, 0.2)} /> : null}
      <line x1={0} y1={zeroPoint} x2={4190} y2={zeroPoint} stroke={backgroundColor} strokeWidth={1} />
      <path d={maxPath} fill={color} />
      <path d={clampHigh} fill={"red"} />
      <path d={clampLow} fill={"red"} />
    </>
  );
}

function linearScale(value: number, inputRange: YRange, outputRange: YRange): number {
  const inputSize = inputRange.max - inputRange.min;
  const outputSize = outputRange.max - outputRange.min;

  if (inputSize === 0) return outputRange.min;

  const normalizedValue = (value - inputRange.min) / inputSize;
  return outputRange.min + normalizedValue * outputSize;
}
