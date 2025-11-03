import { useMemo, useEffect } from "react";
import { useMouseToIndex } from "../../../hooks/useMousePosition";
import { useBrowserStore, useTheme, useTrackStore } from "../../../store/BrowserContext";
import { l, m } from "../../../utils/svg";
import ClipPath from "../../svg/clipPath";
import { BigWigConfig, FullBigWigProps, ValuedPoint, YRange } from "./types";
import useInteraction from "../../../hooks/useInteraction";
import { lighten, isDark } from "../../../utils/color";
import { getRange } from "./helpers";
import { linearScale } from "../../../utils/coordinates";

export default function ReworkBigWig({ data, customRange, id, height, color, dimensions, tooltip }: FullBigWigProps) {
  const { sideWidth, totalWidth, viewWidth } = dimensions;

  const svgRef = useBrowserStore((state) => state.svgRef);
  const delta = useBrowserStore((state) => state.delta);
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const backgroundColor = useTheme((state) => state.background);

  const hasNegatives = useMemo(() => {
    return data.some((point) => (point as ValuedPoint).min < 0);
  }, [data]);

  const editTrack = useTrackStore((state) => state.editTrack);
  const viewRange = useMemo(() => {
    const viewData = data.slice(sideWidth, sideWidth + viewWidth);
    return getRange(viewData);
  }, [data, sideWidth, viewWidth]);

  // Update the track store with the calculated range after render
  useEffect(() => {
    editTrack<BigWigConfig>(id, { range: viewRange });
  }, [id, viewRange, editTrack]);

  const signals = useMemo(() => {
    return generateSignal(data as ValuedPoint[], height, color, customRange || viewRange, backgroundColor);
  }, [data, height, color, customRange, viewRange]);

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
          const point = data[mouseState.index] as ValuedPoint;
          const max = point.max;
          const min = point.min;
          if (!max || !min) return;
          if (max === min || !hasNegatives) {
            handleHover(point, String(max.toFixed(2)), e);
            return;
          }
          handleHover(point, "max: " + String(max.toFixed(2)) + " min: " + String(min.toFixed(2)), e);
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

  // Use high contrast color for clamping indicators
  // Need a color that contrasts with BOTH the track color and background
  const trackIsDark = isDark(color);
  const bgIsDark = backgroundColor ? isDark(backgroundColor) : false;

  let clampColor: string;
  if (trackIsDark && bgIsDark) {
    // Both dark: use bright color (yellow or white)
    clampColor = "#ffff00"; // Yellow for visibility
  } else if (!trackIsDark && !bgIsDark) {
    // Both light: use bright contrasting color (red or magenta)
    clampColor = "#ff0000"; // Red for visibility
  } else if (trackIsDark && !bgIsDark) {
    // Dark track on light background: use a bright color different from both
    clampColor = "#ff0000"; // Red contrasts with both
  } else {
    // Light track on dark background: use a bright color
    clampColor = "#00ff00"; // Green contrasts with both
  }

  let minPath = m(0, zeroPoint);
  let maxPath = m(0, zeroPoint);
  let clampHigh = "";
  let clampLow = "";

  data.forEach((point) => {
    // Clamp values to the current range before scaling
    const clampedMin = Math.max(currentRange.min, Math.min(currentRange.max, point.min));
    const clampedMax = Math.max(currentRange.min, Math.min(currentRange.max, point.max));

    const minY = linearScale(clampedMin, currentRange, { min: 0, max: height });
    const maxY = linearScale(clampedMax, currentRange, { min: 0, max: height });

    minPath +=
      l(point.x, zeroPoint) + l(point.x, height - minY) + l(point.x + 1, height - minY) + l(point.x + 1, zeroPoint);
    maxPath +=
      l(point.x, zeroPoint) + l(point.x, height - maxY) + l(point.x + 1, height - maxY) + l(point.x + 1, zeroPoint);

    if (range && point.min < range.min) {
      clampLow += `M ${point.x} ${height} l 0 -2 `;
    }
    if (range && point.max > range.max) {
      clampHigh += `M ${point.x} 0 l 0 2 `;
    }
  });

  return (
    <>
      {currentRange.min < 0 ? <path d={minPath} fill={lighten(color, 0.2)} /> : null}
      <line x1={0} y1={zeroPoint} x2={4190} y2={zeroPoint} stroke={backgroundColor} strokeWidth={1} />
      <path d={maxPath} fill={color} />
      <path d={clampHigh} stroke={clampColor} strokeWidth="2" fill="none" />
      <path d={clampLow} stroke={clampColor} strokeWidth="2" fill="none" />
    </>
  );
}
