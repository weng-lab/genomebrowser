import { useMemo } from "react";
import { useMouseToIndex } from "../../../hooks/useMousePosition";
import { useBrowserStore, useTheme } from "../../../store/BrowserContext";
import { l, m } from "../../../utils/svg";
import ClipPath from "../../svg/clipPath";
import { FullBigWigProps, ValuedPoint, YRange } from "./types";
import useInteraction from "../../../hooks/useInteraction";

export default function ReworkBigWig({ data, customRange, id, height, color, dimensions, tooltip }: FullBigWigProps) {
  const { sideWidth, totalWidth, viewWidth } = dimensions;

  const svgRef = useBrowserStore((state) => state.svgRef);
  const marginWidth = useBrowserStore((state) => state.marginWidth);

  const signals = useMemo(() => {
    return generateSignal(data as ValuedPoint[], height, color, customRange);
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
      <line stroke={text} x1={linePosition} x2={linePosition} y1={0} y2={height} />
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
          if (max === min) {
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

function generateSignal(data: ValuedPoint[], height: number, color: string, range?: YRange) {
  const dataRange = {
    min: data.map((point) => point.min).reduce((a, b) => Math.min(a, b), Infinity),
    max: data.map((point) => point.max).reduce((a, b) => Math.max(a, b), -Infinity),
  };
  const currentRange = range || dataRange;
  const zeroPoint = height - linearScale(0, currentRange, { min: 0, max: height });

  let minPath = m(0, zeroPoint);
  let maxPath = m(0, zeroPoint);

  data.forEach((point) => {
    const minY = linearScale(point.min, currentRange, { min: 0, max: height });
    const maxY = linearScale(point.max, currentRange, { min: 0, max: height });

    minPath += l(point.x, height - minY) + l(point.x + 1, height - minY) + l(point.x + 1, zeroPoint);
    maxPath += l(point.x, height - maxY) + l(point.x + 1, height - maxY) + l(point.x + 1, zeroPoint);
  });

  return (
    <>
      {currentRange.min < 0 ? <path d={minPath} fill={color} /> : null}
      <line x1={0} y1={zeroPoint} x2={4190} y2={zeroPoint} stroke={"white"} strokeWidth={1} />
      <path d={maxPath} fill={color} />
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
