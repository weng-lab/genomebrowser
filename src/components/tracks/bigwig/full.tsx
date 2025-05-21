import { createElement, useEffect, useMemo, useState } from "react";
import { useBrowserStore } from "../../../store/browserStore";
import ClipPath from "../../svg/clipPath";

import {
  BigWigData,
  BigZoomData,
  ValuedPoint,
  dataType,
  DataType,
  Paths,
  RenderedBigWigData,
  FullBigWigProps,
} from "./types";

import { useTrackStore } from "../../../store/trackStore";
import { createCopy, getRange, renderBigWig, ytransform } from "./helpers";
import { svgPoint, l } from "../../../utils/svg";
import { BigWigConfig } from "./types";
import { useTheme } from "../../../store/themeStore";
import { useTooltipStore } from "../../../store/tooltipStore";

export default function FullBigWig({ data, range, id, height, color, dimensions, tooltip }: FullBigWigProps) {
  const { multiplier, sideWidth, sidePortion, totalWidth, viewWidth } = dimensions;
  const editTrack = useTrackStore((state) => state.editTrack);
  const delta = useBrowserStore((state) => state.delta);
  const marginWidth = useBrowserStore((state) => state.marginWidth);

  const [x, setX] = useState<number>();

  const realRange = useMemo(() => {
    const length = data?.length ?? 0;
    const middleSectionSize = length / multiplier;
    const startIndex = Math.floor(sidePortion * middleSectionSize);
    const endIndex = Math.floor((sidePortion + 1) * middleSectionSize);
    const middleSlice = data?.slice(startIndex, endIndex);
    const newRange = getRange(middleSlice ?? []);
    return newRange;
  }, [data, multiplier, sidePortion]);

  useEffect(() => {
    editTrack<BigWigConfig>(id, { range: realRange });
  }, [realRange, id, editTrack]);

  const dataCopy = useMemo(() => createCopy(data ?? []), [data]);

  const rendered: RenderedBigWigData = useMemo(
    () =>
      dataCopy && dataCopy.length && dataType(dataCopy) === DataType.ValuedPoint
        ? { renderPoints: dataCopy as ValuedPoint[], range: range || getRange(dataCopy) }
        : renderBigWig(dataCopy as BigWigData[] | BigZoomData[], totalWidth),
    [dataCopy, totalWidth, range]
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
      }, "M 0 " + clampY(0.0) + " ") + l(totalWidth, clampY(0.0));

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
  }, [rendered, height, realRange, totalWidth]);

  const showTooltip = useTooltipStore((state) => state.showTooltip);
  const hideTooltip = useTooltipStore((state) => state.hideTooltip);
  const svgRef = useBrowserStore((state) => state.svgRef);
  const mouseOver = (e: React.MouseEvent<SVGElement>) => {
    if (!svgRef || !svgRef.current) return;
    const pos = svgPoint(svgRef.current, e.clientX, e.clientY);
    setX(pos[0]);
    const len = data.length;
    const adjustedX = Math.round(pos[0] - marginWidth);
    const start = len / multiplier;
    const end = start * 2;
    const x = (adjustedX / viewWidth) * (end - start) + start;
    const point = data[Math.round(x)] as BigWigData;
    let content = <text fill={text}>{point.value.toFixed(2)}</text>;
    if (tooltip) {
      content = createElement(tooltip, point);
    }
    showTooltip(content, e.clientX, e.clientY);
  };

  const mouseOut = () => {
    setX(undefined);
    hideTooltip();
  };

  const { background, text } = useTheme();

  return (
    <g width={totalWidth} height={height} clipPath={`url(#${id})`} transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill={background} />
      <defs>
        <ClipPath id={id} width={totalWidth} height={height} />
      </defs>
      <path d={paths.path} fill={color || "#000000"} style={{ clipPath: `url(#${id})` }} />
      <path d={paths.clampedMarkers} stroke="red" strokeWidth="1" fill="none" />
      {!delta && (
        <line
          stroke={text}
          x1={x ? x - marginWidth + sideWidth : 0}
          x2={x ? x - marginWidth + sideWidth : 0}
          y1={0}
          y2={height}
        />
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
